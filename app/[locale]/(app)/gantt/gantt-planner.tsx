"use client";

// Client Component: the laptop Gantt for the Lagerleitung. All groups at once,
// one row per group (plus "Alle Gruppen" on top), Mo–Fr side by side along the
// top. It scrolls sideways, opens at today and can be zoomed. The shared edit
// mode lives in ../_plan/plan-editor.tsx; here dragging is sideways, and a
// group's session can also be dragged into another group's row.

import { PlusIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { categoryClasses } from "@/components/category";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  ChangedDot,
  DragTip,
  NEW_SESSION_MINUTES,
  PlanHeader,
  SNAP,
  clamp,
  snap,
  useDragListeners,
  useKeepFocus,
  usePlanEditor,
  useTimeFormat,
} from "../_plan/plan-editor";
import { placeSideBySide } from "../_plan/side-by-side";
import type { PlanData, Placement, PlannerSession } from "../_plan/types";

const LABEL_WIDTH = 148; // px, the group names on the left
const HEADER_HEIGHT = 56; // px, days and hours on top
const ROW_HEIGHT = 60;
const BAR_TOP = 5; // space above and below the bars in a row
const BAR_HEIGHT = ROW_HEIGHT - 2 * BAR_TOP;
const DAY_GAP = 16; // px between two days
const HOUR_WIDTH = 40; // px per hour at 100 %, so about two days fit on a laptop screen
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2];
const EDGE_SCROLL = 24; // px per mouse move when dragging near the left or right edge

type Drag =
  // Moving a session: `grab` is how far after its start it was grabbed (in minutes).
  | { kind: "move"; id: string; grab: number; placement: Placement }
  // Dragging a session's right edge.
  | { kind: "resize"; id: string; placement: Placement }
  // Drawing a new session in a row: `anchor` is the quarter hour where it started.
  | { kind: "draw"; anchor: number; placement: Placement; moved: boolean };

type GanttPlannerProps = {
  plan: PlanData; // every session of the camp
  subtitle: string; // "Alle 10 Gruppen · Herbstlager 2026 · 12.–16. Oktober"
};

export function GanttPlanner({ plan, subtitle }: GanttPlannerProps) {
  const { days, lanes, sessions, today, nowMinute, gridStart, gridEnd } = plan;
  const t = useTranslations("Wochenplan");
  const tGantt = useTranslations("Gantt");
  const tSession = useTranslations("Session");
  const tDuration = useTranslations("Duration");
  const format = useFormatter();
  const { time, timeRange } = useTimeFormat();
  const editor = usePlanEditor();
  const { editing, drafts } = editor;
  const [drag, setDrag] = useState<Drag | null>(null);
  const keepFocus = useKeepFocus();
  const [zoom, setZoom] = useState(1);

  const scrollArea = useRef<HTMLDivElement>(null);
  const rowsArea = useRef<HTMLDivElement>(null);
  // After a zoom change: where to scroll, so the middle of the screen stays put.
  const pendingScroll = useRef<number | null>(null);

  // --- Geometry: everything scales with the zoom ---
  const pxPerMinute = (HOUR_WIDTH / 60) * zoom;
  const dayWidth = (gridEnd - gridStart) * pxPerMinute;
  const dayX = (index: number) => index * (dayWidth + DAY_GAP);
  const trackWidth = dayX(days.length - 1) + dayWidth;
  const dayIndex = (date: string) => days.findIndex((d) => d.date === date);
  const xOf = (day: string, minute: number) => dayX(dayIndex(day)) + (minute - gridStart) * pxPerMinute;
  // At 50 % the hour labels would touch, so only every second hour is labelled.
  const labelEvery = HOUR_WIDTH * zoom < 28 ? 2 : 1;
  const hours = Array.from({ length: Math.ceil((gridEnd - gridStart) / 60) - 1 }, (_, i) => gridStart + (i + 1) * 60);

  // Row 0 holds the sessions for all groups (or all coaches), then one row per group.
  const rows = [{ id: null, name: tSession("allGroups"), label: tSession("allGroups") }, ...lanes];
  const groupLabel = (laneId: string | null) => rows.find((r) => r.id === laneId)?.label ?? "";
  const dayLabel = (date: string, kind: "longLabel" | "shortLabel") => days.find((d) => d.date === date)?.[kind] ?? "";

  // --- Opens scrolled to today, a bit of the evening before still visible ---
  useEffect(() => {
    const todayIndex = dayIndex(today);
    if (scrollArea.current && todayIndex > 0) scrollArea.current.scrollLeft = dayX(todayIndex) - 120;
    // Only once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Applies the scroll position worked out in changeZoom, right after the wider or narrower plan is drawn.
  useLayoutEffect(() => {
    if (scrollArea.current && pendingScroll.current !== null) {
      scrollArea.current.scrollLeft = pendingScroll.current;
      pendingScroll.current = null;
    }
  }, [zoom]);

  function changeZoom(value: string) {
    const next = Number(value);
    const area = scrollArea.current;
    if (area) {
      // Keep the time in the middle of the visible track in the middle.
      const half = (area.clientWidth - LABEL_WIDTH) / 2;
      pendingScroll.current = (area.scrollLeft + half) * (next / zoom) - half;
    }
    setZoom(next);
  }

  // Where a session is shown: while dragging, where the mouse is; otherwise its unsaved change or the saved plan.
  const placementOf = (s: PlannerSession): Placement =>
    drag && drag.kind !== "draw" && drag.id === s.id ? drag.placement : editor.placementOf(s);

  // --- Turning the mouse position into a day, minute and row ---
  function pointToSlot(clientX: number, clientY: number) {
    const rect = rowsArea.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clientX - rect.left - LABEL_WIDTH;
    const index = clamp(Math.floor(x / (dayWidth + DAY_GAP)), 0, days.length - 1);
    const row = clamp(Math.floor((clientY - rect.top) / ROW_HEIGHT), 0, rows.length - 1);
    // `minuteOn` reads the same position on another day, e.g. while resizing a session.
    const minuteOn = (date: string) => gridStart + (x - dayX(dayIndex(date))) / pxPerMinute;
    return { day: days[index].date, minute: minuteOn(days[index].date), minuteOn, row };
  }

  // --- Starting a drag (pointerdown) ---
  function startMove(event: PointerEvent, s: PlannerSession) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation(); // don't also start drawing in the row behind
    const slot = pointToSlot(event.clientX, event.clientY);
    const placement = placementOf(s);
    if (slot) setDrag({ kind: "move", id: s.id, grab: slot.minuteOn(placement.day) - placement.start, placement });
  }

  function startResize(event: PointerEvent, s: PlannerSession) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setDrag({ kind: "resize", id: s.id, placement: placementOf(s) });
  }

  function startDraw(event: PointerEvent) {
    if (!editing || event.button !== 0) return;
    event.preventDefault();
    const slot = pointToSlot(event.clientX, event.clientY);
    if (!slot) return;
    const anchor = clamp(Math.floor(slot.minute / SNAP) * SNAP, gridStart, gridEnd - SNAP);
    const end = Math.min(anchor + NEW_SESSION_MINUTES, gridEnd);
    const laneId = rows[slot.row].id;
    setDrag({ kind: "draw", anchor, moved: false, placement: { day: slot.day, start: anchor, end, laneId } });
  }

  // --- While dragging ---
  useDragListeners(drag !== null, {
    move(event) {
      // Near the left or right edge, scroll along, so other days can be reached.
      const area = scrollArea.current;
      if (area) {
        const r = area.getBoundingClientRect();
        if (event.clientX > r.right - 40) area.scrollLeft += EDGE_SCROLL;
        else if (event.clientX < r.left + LABEL_WIDTH + 40) area.scrollLeft -= EDGE_SCROLL;
      }
      const slot = pointToSlot(event.clientX, event.clientY);
      if (!slot || !drag) return;
      const { placement } = drag;
      if (drag.kind === "move") {
        const length = placement.end - placement.start;
        const start = clamp(snap(slot.minute - drag.grab), gridStart, gridEnd - length);
        // A group's session can move into another group's row; sessions for all groups stay in their row.
        const target = rows[slot.row].id;
        const laneId = placement.laneId !== null && target !== null ? target : placement.laneId;
        setDrag({ ...drag, placement: { day: slot.day, start, end: start + length, laneId } });
      } else if (drag.kind === "resize") {
        const end = clamp(snap(slot.minuteOn(placement.day)), placement.start + SNAP, gridEnd);
        setDrag({ ...drag, placement: { ...placement, end } });
      } else {
        // Drawing stays in its day and row. Dragging to the left works too.
        const minute = clamp(snap(slot.minuteOn(placement.day)), gridStart, gridEnd);
        if (!drag.moved && minute === drag.anchor) return; // still a plain click
        const start = Math.min(drag.anchor, minute);
        const end = Math.max(drag.anchor + SNAP, minute);
        setDrag({ ...drag, moved: true, placement: { ...placement, start, end } });
      }
    },
    up() {
      if (!drag) return;
      setDrag(null);
      if (drag.kind === "draw") return editor.openNewSession(drag.placement);
      const saved = sessions.find((s) => s.id === drag.id);
      if (saved) editor.setDraft(saved, drag.placement);
    },
    cancel: () => setDrag(null),
  });

  // Keyboard instead of dragging: left/right move by 15 minutes, Shift + left/right
  // changes the length, up/down move a group's session into the group above or below.
  function onBarKey(event: KeyboardEvent, s: PlannerSession) {
    const p = placementOf(s);
    const length = p.end - p.start;
    let next: Placement | null = null;
    if (event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      next = { ...p, end: clamp(p.end + (event.key === "ArrowLeft" ? -SNAP : SNAP), p.start + SNAP, gridEnd) };
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const start = clamp(p.start + (event.key === "ArrowLeft" ? -SNAP : SNAP), gridStart, gridEnd - length);
      next = { ...p, start, end: start + length };
    } else if ((event.key === "ArrowUp" || event.key === "ArrowDown") && p.laneId !== null) {
      const index = lanes.findIndex((l) => l.id === p.laneId) + (event.key === "ArrowUp" ? -1 : 1);
      next = { ...p, laneId: lanes[clamp(index, 0, lanes.length - 1)].id };
    }
    if (!next) return;
    event.preventDefault();
    keepFocus(s.id);
    editor.setDraft(s, next);
  }

  // --- Layout ---
  const draggedId = drag && drag.kind !== "draw" ? drag.id : null;
  const dragged = draggedId ? sessions.find((s) => s.id === draggedId) : undefined;
  // Where the moved session was before this drag started.
  const ghost = dragged && drag?.kind === "move" ? editor.placementOf(dragged) : null;

  // A row's bars. Overlapping sessions in the same row share its height. The
  // dragged bar is drawn separately on top, so the others don't jump around under the mouse.
  const barsOfRow = (laneId: string | null) =>
    placeSideBySide(
      sessions
        .map((session) => ({ session, ...placementOf(session) }))
        .filter((b) => b.laneId === laneId && b.session.id !== draggedId)
        // Sort by day, then time: placeSideBySide expects them in order.
        .map((b) => ({ ...b, start: xOf(b.day, b.start), end: xOf(b.day, b.end), placement: b }))
        .sort((a, b) => a.start - b.start),
    );

  const geometry = (p: Placement, column = 0, count = 1) => ({
    left: xOf(p.day, p.start) + 1,
    width: (p.end - p.start) * pxPerMinute - 2,
    top: BAR_TOP + column * (BAR_HEIGHT / count),
    height: BAR_HEIGHT / count - (count > 1 ? 2 : 0),
  });

  // Group sessions show their short name and start; wide bars for all groups show the full title and both times.
  function barContent(s: PlannerSession, p: Placement) {
    const width = geometry(p).width;
    const full = p.laneId === null && width > 120;
    return (
      <>
        {/* Narrow bars: break at hyphenation points or clip, never in the middle of a word ("Jud/o"). */}
        <span className="block max-h-[26px] overflow-hidden font-semibold [overflow-wrap:normal]">
          {full ? s.title : s.shortName}
        </span>
        {width >= 40 && <span className="block whitespace-nowrap">{full ? timeRange(p) : time(p.start)}</span>}
        {drafts[s.id] && <ChangedDot />}
        {editing && (
          // The right edge: drag it to change the length. The bar in the middle shows where to grab.
          <span
            aria-hidden="true"
            onPointerDown={(event) => startResize(event, s)}
            className="absolute inset-y-0 right-0 flex w-2 cursor-ew-resize items-center justify-end pr-0.5"
          >
            <span className="h-4 w-[3px] rounded-full bg-current opacity-60" />
          </span>
        )}
      </>
    );
  }

  const barClasses = (s: PlannerSession) =>
    cn(
      "absolute z-1 overflow-hidden rounded-sm px-[5px] py-[3px] text-[11px] leading-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
      categoryClasses[s.category],
    );
  const barLabel = (s: PlannerSession, p: Placement) =>
    t("blockLabel", {
      title: s.title,
      group: p.laneId === null ? s.groupLabel : groupLabel(p.laneId),
      date: dayLabel(p.day, "longLabel"),
      start: time(p.start),
      end: time(p.end),
    });
  // Tooltips in the last two rows go above the bar, so they stay inside the plan.
  const tipAbove = (laneId: string | null) => rows.findIndex((r) => r.id === laneId) >= rows.length - 2;

  const zoomSelect = (
    <Select value={String(zoom)} onValueChange={changeZoom}>
      <SelectTrigger aria-label={tGantt("zoom")} className="w-28 shrink-0 bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ZOOM_LEVELS.map((level) => (
          <SelectItem key={level} value={String(level)}>
            {format.number(level, { style: "percent" })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    // The page doesn't scroll; the plan scrolls inside its card, in both directions.
    <main className="flex h-svh flex-col gap-4 p-6">
      <PlanHeader
        editor={editor}
        title={tGantt("title")}
        subtitle={subtitle}
        editHint={tGantt("editModeHint")}
        keyboardHint={tGantt("keyboardHint")}
        hint={tGantt("scrollHint")}
        zoom={zoomSelect}
      />

      <section
        aria-label={tGantt("regionLabel")}
        className={cn("min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm", drag && "select-none")}
      >
        <div ref={scrollArea} className="h-full overflow-auto">
          <div className="relative" style={{ width: LABEL_WIDTH + trackWidth }}>
            {/* Days and hours. Stays on top while scrolling down. */}
            <div className="sticky top-0 z-20 flex border-b bg-card" style={{ height: HEADER_HEIGHT }}>
              <div
                className="sticky left-0 z-30 flex shrink-0 items-end border-r bg-card pr-3 pb-2 pl-4 text-xs font-medium"
                style={{ width: LABEL_WIDTH }}
              >
                {tGantt("groupColumn")}
              </div>
              <div className="relative shrink-0" style={{ width: trackWidth }}>
                {days.map((day, index) => (
                  <div key={day.date} className="absolute inset-y-0" style={{ left: dayX(index), width: dayWidth }}>
                    <div className="flex h-8 items-center gap-2 pl-1">
                      <span className="text-sm font-semibold">{day.weekday}</span>
                      <span
                        className={cn(
                          "flex h-[26px] min-w-[26px] items-center justify-center rounded-full px-1.5 text-[13px] font-bold",
                          day.date === today && "bg-primary text-primary-foreground",
                        )}
                      >
                        {day.dayNumber}
                      </span>
                      {day.date === today && <span className="text-xs font-medium">{t("today")}</span>}
                    </div>
                    {hours.map((minute) =>
                      (minute / 60) % labelEvery === 0 ? (
                        <span
                          key={minute}
                          className="absolute top-9 -translate-x-1/2 font-mono text-[11px] leading-3"
                          style={{ left: (minute - gridStart) * pxPerMinute }}
                        >
                          {format.number(minute / 60, { minimumIntegerDigits: 2 })}
                        </span>
                      ) : null,
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div ref={rowsArea}>
              {rows.map((row) => (
                <div key={row.id ?? "all"} className="flex border-b" style={{ height: ROW_HEIGHT }}>
                  {/* Group name. Stays on the left while scrolling sideways. */}
                  <div
                    className={cn(
                      "sticky left-0 z-10 flex shrink-0 items-center border-r pr-3 pl-4 text-sm",
                      row.id === null ? "bg-muted font-semibold" : "bg-card font-medium",
                    )}
                    style={{ width: LABEL_WIDTH }}
                  >
                    {row.name}
                  </div>

                  <div
                    onPointerDown={startDraw}
                    className={cn("relative shrink-0", editing && "cursor-crosshair touch-none")}
                    style={{ width: trackWidth }}
                  >
                    {days.map((day, index) => (
                      <span
                        key={day.date}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0"
                        style={{
                          left: dayX(index),
                          width: dayWidth,
                          // A thin line every hour, and in edit mode faint quarter-hour lines for the snap grid.
                          backgroundImage: [
                            `repeating-linear-gradient(to right, var(--border) 0 1px, transparent 1px ${60 * pxPerMinute}px)`,
                            ...(editing
                              ? [`repeating-linear-gradient(to right, color-mix(in srgb, var(--border) 45%, transparent) 0 1px, transparent 1px ${15 * pxPerMinute}px)`]
                              : []),
                          ].join(", "),
                        }}
                      />
                    ))}

                    {/* While moving: a dashed outline where the session was. */}
                    {ghost && ghost.laneId === row.id && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-sm border-2 border-dashed border-foreground opacity-45"
                        style={geometry(ghost)}
                      />
                    )}

                    {barsOfRow(row.id).map(({ session: s, placement: p, column, columns: count }) => {
                      const style = geometry(p, column, count);
                      return editing ? (
                        <div
                          key={s.id}
                          role="button"
                          tabIndex={0}
                          data-session-id={s.id}
                          aria-label={barLabel(s, p)}
                          aria-describedby="plan-keys"
                          onPointerDown={(event) => startMove(event, s)}
                          onKeyDown={(event) => onBarKey(event, s)}
                          className={cn(barClasses(s), "cursor-grab touch-none")}
                          style={style}
                        >
                          {barContent(s, p)}
                        </div>
                      ) : (
                        <Link
                          key={s.id}
                          href={`/einheit/${s.id}`}
                          aria-label={barLabel(s, p)}
                          className={barClasses(s)}
                          style={style}
                        >
                          {barContent(s, p)}
                        </Link>
                      );
                    })}

                    {/* The bar being moved or resized, lifted above the others. */}
                    {dragged && drag && drag.kind !== "draw" && drag.placement.laneId === row.id && (
                      <div
                        className={cn(
                          barClasses(dragged),
                          "z-[8] overflow-visible ring-2 ring-ring",
                          drag.kind === "move" ? "cursor-grabbing shadow-xl" : "cursor-ew-resize",
                        )}
                        style={geometry(drag.placement)}
                      >
                        {barContent(dragged, drag.placement)}
                        <DragTip
                          align="left"
                          above={tipAbove(row.id)}
                          text={
                            drag.kind === "move"
                              ? tGantt("moveTip", {
                                  group: drag.placement.laneId === null ? dragged.groupLabel : groupLabel(drag.placement.laneId),
                                  date: dayLabel(drag.placement.day, "shortLabel"),
                                  time: timeRange(drag.placement),
                                })
                              : t("resizeTip", {
                                  time: timeRange(drag.placement),
                                  duration: tDuration("minutes", { minutes: drag.placement.end - drag.placement.start }),
                                })
                          }
                        />
                      </div>
                    )}

                    {/* The new session being drawn. */}
                    {drag?.kind === "draw" && drag.placement.laneId === row.id && (
                      <div
                        className="absolute z-[8] rounded-sm border-2 border-dashed border-primary bg-card px-[5px] py-[3px] text-[11px] leading-[13px]"
                        style={geometry(drag.placement)}
                      >
                        <span className="flex items-center gap-0.5 font-semibold">
                          <PlusIcon aria-hidden="true" className="size-3" />
                          {t("newBlock")}
                        </span>
                        <span className="block">{time(drag.placement.start)}</span>
                        <DragTip
                          align="left"
                          above={tipAbove(row.id)}
                          text={t("newTip", { group: groupLabel(row.id), time: timeRange(drag.placement) })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {nowMinute !== null && dayIndex(today) >= 0 && (
              <span
                role="img"
                aria-label={t("nowLine", { time: time(nowMinute) })}
                className="pointer-events-none absolute bottom-0 z-[5] w-0.5 bg-primary"
                style={{ top: HEADER_HEIGHT, left: LABEL_WIDTH + xOf(today, nowMinute) }}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
