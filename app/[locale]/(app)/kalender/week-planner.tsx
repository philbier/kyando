"use client";

// Client Component: the laptop Wochenplan for the Lagerleitung, one group (or
// "Meine Einheiten") at a time. It has to be one, because edit mode keeps
// unsaved changes in the browser and reacts to dragging. The page (a Server
// Component) prepares the sessions and labels; the shared edit mode lives in
// ../_plan/plan-editor.tsx.

import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { categoryClasses } from "@/components/category";
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

const HOUR_HEIGHT = 52; // px
const PX_PER_MINUTE = HOUR_HEIGHT / 60;

// What is being dragged right now.
type Drag =
  // Moving a session: `grab` is how far below its start it was grabbed (in minutes).
  | { kind: "move"; id: string; grab: number; placement: Placement }
  // Dragging a session's bottom edge.
  | { kind: "resize"; id: string; placement: Placement }
  // Drawing a new session: `anchor` is the quarter hour where it started.
  | { kind: "draw"; anchor: number; placement: Placement; moved: boolean };

type WeekPlannerProps = {
  plan: PlanData; // sessions already filtered to the selected group or "Meine Einheiten"
  subtitle: string; // "Herbstlager 2026 · 12.–16. Oktober"
  selectedGroupId: string | null; // null = "Meine Einheiten"; new sessions get this group
  filter: ReactNode; // the group dropdown
};

export function WeekPlanner({ plan, subtitle, selectedGroupId, filter }: WeekPlannerProps) {
  const { days, lanes, sessions, today, nowMinute, gridStart, gridEnd } = plan;
  const t = useTranslations("Wochenplan");
  const tSession = useTranslations("Session");
  const tDuration = useTranslations("Duration");
  const { time, timeRange } = useTimeFormat();
  const editor = usePlanEditor();
  const { editing, drafts } = editor;
  const [drag, setDrag] = useState<Drag | null>(null);
  const keepFocus = useKeepFocus();

  // The day columns' DOM elements, to turn a mouse position into a day and time.
  const columns = useRef(new Map<string, HTMLDivElement>());

  const gridHeight = (gridEnd - gridStart) * PX_PER_MINUTE;
  const hours = Array.from({ length: Math.floor((gridEnd - gridStart) / 60) + 1 }, (_, i) => gridStart + i * 60);
  const groupLabel = (laneId: string | null) =>
    lanes.find((l) => l.id === laneId)?.label ?? tSession("allGroups");
  const dayLabel = (date: string, kind: "longLabel" | "shortLabel") => days.find((d) => d.date === date)?.[kind] ?? "";

  // Where a session is shown: while dragging, where the mouse is; otherwise its unsaved change or the saved plan.
  const placementOf = (s: PlannerSession): Placement =>
    drag && drag.kind !== "draw" && drag.id === s.id ? drag.placement : editor.placementOf(s);

  // --- Turning the mouse position into a day and minute ---
  function pointToSlot(clientX: number, clientY: number) {
    let best: { day: string; rect: DOMRect; distance: number } | null = null;
    for (const [day, element] of columns.current) {
      const rect = element.getBoundingClientRect();
      // 0 inside the column, otherwise how far to its left or right.
      const distance = Math.max(rect.left - clientX, 0, clientX - rect.right);
      if (!best || distance < best.distance) best = { day, rect, distance };
    }
    if (!best) return null;
    return { day: best.day, minute: gridStart + (clientY - best.rect.top) / PX_PER_MINUTE };
  }

  // --- Starting a drag (pointerdown) ---
  function startMove(event: PointerEvent, s: PlannerSession) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation(); // don't also start drawing in the column behind
    const slot = pointToSlot(event.clientX, event.clientY);
    const placement = placementOf(s);
    if (slot) setDrag({ kind: "move", id: s.id, grab: slot.minute - placement.start, placement });
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
    setDrag({ kind: "draw", anchor, moved: false, placement: { day: slot.day, start: anchor, end, laneId: selectedGroupId } });
  }

  // --- While dragging ---
  useDragListeners(drag !== null, {
    move(event) {
      const slot = pointToSlot(event.clientX, event.clientY);
      if (!slot || !drag) return;
      const { placement } = drag;
      if (drag.kind === "move") {
        const length = placement.end - placement.start;
        const start = clamp(snap(slot.minute - drag.grab), gridStart, gridEnd - length);
        setDrag({ ...drag, placement: { ...placement, day: slot.day, start, end: start + length } });
      } else if (drag.kind === "resize") {
        const end = clamp(snap(slot.minute), placement.start + SNAP, gridEnd);
        setDrag({ ...drag, placement: { ...placement, end } });
      } else {
        // Drawing stays in its day. Dragging upwards works too.
        const minute = clamp(snap(slot.minute), gridStart, gridEnd);
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

  // Keyboard instead of dragging: arrows move by 15 minutes or one day, Shift + up/down changes the length.
  function onBlockKey(event: KeyboardEvent, s: PlannerSession) {
    const p = placementOf(s);
    const length = p.end - p.start;
    let next: Placement | null = null;
    if (event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      next = { ...p, end: clamp(p.end + (event.key === "ArrowUp" ? -SNAP : SNAP), p.start + SNAP, gridEnd) };
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const start = clamp(p.start + (event.key === "ArrowUp" ? -SNAP : SNAP), gridStart, gridEnd - length);
      next = { ...p, start, end: start + length };
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const index = days.findIndex((d) => d.date === p.day) + (event.key === "ArrowLeft" ? -1 : 1);
      next = { ...p, day: days[clamp(index, 0, days.length - 1)].date };
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

  // A day's blocks. Overlapping sessions share the column side by side. The
  // dragged block is drawn separately on top, so the others don't jump around under the mouse.
  const blocksOfDay = (day: string) =>
    placeSideBySide(
      sessions
        .map((session) => ({ session, ...placementOf(session) }))
        .filter((b) => b.day === day && b.session.id !== draggedId)
        .sort((a, b) => a.start - b.start),
    );

  const vertical = (p: Placement) => ({
    top: (p.start - gridStart) * PX_PER_MINUTE + 1,
    height: (p.end - p.start) * PX_PER_MINUTE - 2,
  });
  const horizontal = (column = 0, count = 1) => ({
    left: `${(column / count) * 100}%`,
    width: `calc(${100 / count}% - ${count > 1 ? 2 : 0}px)`,
  });

  // Title, time and "location · group". The group is shown when it isn't the selected one
  // ("Alle Gruppen" in a group's view, every group under "Meine Einheiten").
  function blockContent(s: PlannerSession, p: Placement) {
    const height = vertical(p).height;
    const sub = [s.location, p.laneId !== selectedGroupId ? groupLabel(p.laneId) : null].filter(Boolean).join(" · ");
    return (
      <>
        <span className="block text-[13px] font-semibold">{s.title}</span>
        {height >= 34 && <span className="block">{timeRange(p)}</span>}
        {height >= 56 && sub && <span className="block">{sub}</span>}
        {drafts[s.id] && <ChangedDot />}
        {editing && (
          // The bottom edge: drag it to change the length. The bar in the middle shows where to grab.
          <span
            aria-hidden="true"
            onPointerDown={(event) => startResize(event, s)}
            className="absolute inset-x-0 bottom-0 flex h-2 cursor-ns-resize items-end justify-center pb-0.5"
          >
            <span className="h-[3px] w-5 rounded-full bg-current opacity-60" />
          </span>
        )}
      </>
    );
  }

  const blockClasses = (s: PlannerSession) =>
    cn(
      "absolute z-1 overflow-hidden rounded-md px-2 py-[5px] text-xs leading-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
      categoryClasses[s.category],
    );
  const blockLabel = (s: PlannerSession, p: Placement) =>
    t("blockLabel", {
      title: s.title,
      group: groupLabel(p.laneId),
      date: dayLabel(p.day, "longLabel"),
      start: time(p.start),
      end: time(p.end),
    });

  const gridColumns = { gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` };

  return (
    <main className="flex flex-col gap-4 p-6">
      <PlanHeader
        editor={editor}
        title={t("title")}
        subtitle={subtitle}
        editHint={t("editModeHint")}
        keyboardHint={t("keyboardHint")}
        filter={filter}
      />

      <section
        aria-label={t("regionLabel", { group: groupLabel(selectedGroupId) })}
        className={cn("rounded-xl border bg-card pt-3 pr-4 pb-4 pl-2 shadow-sm", drag && "select-none")}
      >
        {/* Day headers stay visible while the page scrolls. */}
        <div className="sticky top-0 z-40 grid gap-x-3 bg-card" style={gridColumns}>
          <span />
          {days.map((day) => (
            <div key={day.date} className="flex h-9 items-center gap-2 border-b">
              <span className="text-sm font-semibold">{day.weekday}</span>
              <span
                className={cn(
                  "flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-bold",
                  day.date === today && "bg-primary text-primary-foreground",
                )}
              >
                {day.dayNumber}
              </span>
              {day.date === today && <span className="text-xs font-medium">{t("today")}</span>}
            </div>
          ))}
        </div>

        <div className="grid gap-x-3 pt-2" style={gridColumns}>
          <div className="relative" style={{ height: gridHeight }}>
            {hours.map((minute) => (
              <span
                key={minute}
                className="absolute right-1 -translate-y-1/2 font-mono text-[11px] leading-3"
                style={{ top: (minute - gridStart) * PX_PER_MINUTE }}
              >
                {time(minute)}
              </span>
            ))}
          </div>

          {days.map((day) => (
            <div
              key={day.date}
              ref={(element) => {
                if (element) columns.current.set(day.date, element);
                else columns.current.delete(day.date);
              }}
              onPointerDown={startDraw}
              className={cn("relative", editing && "cursor-crosshair touch-none")}
              style={{
                height: gridHeight,
                // A thin line every hour.
                backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px ${HOUR_HEIGHT}px)`,
              }}
            >
              {/* Edit mode: faint quarter-hour lines show the snap grid. */}
              {editing && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-45"
                  style={{
                    backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px ${HOUR_HEIGHT / 4}px)`,
                  }}
                />
              )}

              {/* While moving: a dashed outline where the session was. */}
              {ghost?.day === day.date && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute rounded-md border-2 border-dashed border-foreground opacity-45"
                  style={{ ...vertical(ghost), ...horizontal() }}
                />
              )}

              {blocksOfDay(day.date).map(({ session: s, column, columns: count, ...p }) => {
                const style = { ...vertical(p), ...horizontal(column, count) };
                return editing ? (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    data-session-id={s.id}
                    aria-label={blockLabel(s, p)}
                    aria-describedby="plan-keys"
                    onPointerDown={(event) => startMove(event, s)}
                    onKeyDown={(event) => onBlockKey(event, s)}
                    className={cn(blockClasses(s), "cursor-grab touch-none")}
                    style={style}
                  >
                    {blockContent(s, p)}
                  </div>
                ) : (
                  <Link
                    key={s.id}
                    href={`/einheit/${s.id}`}
                    aria-label={blockLabel(s, p)}
                    className={blockClasses(s)}
                    style={style}
                  >
                    {blockContent(s, p)}
                  </Link>
                );
              })}

              {/* The block being moved or resized, lifted above the others. */}
              {dragged && drag && drag.kind !== "draw" && drag.placement.day === day.date && (
                <div
                  className={cn(
                    blockClasses(dragged),
                    "z-20 overflow-visible ring-2 ring-ring",
                    drag.kind === "move" ? "cursor-grabbing shadow-xl" : "cursor-ns-resize",
                  )}
                  style={{ ...vertical(drag.placement), ...horizontal() }}
                >
                  {blockContent(dragged, drag.placement)}
                  <DragTip
                    align="left"
                    text={
                      drag.kind === "move"
                        ? t("moveTip", { date: dayLabel(drag.placement.day, "shortLabel"), time: timeRange(drag.placement) })
                        : t("resizeTip", {
                            time: timeRange(drag.placement),
                            duration: tDuration("minutes", { minutes: drag.placement.end - drag.placement.start }),
                          })
                    }
                  />
                </div>
              )}

              {/* The new session being drawn. */}
              {drag?.kind === "draw" && drag.placement.day === day.date && (
                <div
                  className="absolute z-20 rounded-md border-2 border-dashed border-primary bg-card px-2 py-[5px] text-xs leading-4"
                  style={{ ...vertical(drag.placement), ...horizontal() }}
                >
                  <span className="flex items-center gap-1 text-[13px] font-semibold">
                    <PlusIcon aria-hidden="true" className="size-3.5" />
                    {t("newBlock")}
                  </span>
                  <span className="block">{timeRange(drag.placement)}</span>
                  <DragTip
                    align={days.findIndex((d) => d.date === day.date) >= days.length - 2 ? "right" : "left"}
                    text={t("newTip", { group: groupLabel(selectedGroupId), time: timeRange(drag.placement) })}
                  />
                </div>
              )}

              {nowMinute !== null && day.date === today && (
                <span
                  role="img"
                  aria-label={t("nowLine", { time: time(nowMinute) })}
                  className="pointer-events-none absolute -left-1 right-0 z-30 h-0.5 bg-primary"
                  style={{ top: (nowMinute - gridStart) * PX_PER_MINUTE }}
                />
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
