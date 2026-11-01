"use client";

// Client Component and hooks shared by the laptop Wochenplan and Gantt: the
// edit mode (unsaved changes, saving, "discard changes?"), the page header with
// its toolbar, and small helpers for dragging. Each view only adds its own
// layout and how the mouse position turns into a day, time and group.

import { useRouter as useNextRouter } from "next/navigation";
import { AlertCircleIcon, CheckIcon, PencilIcon, XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { CategoryLegend } from "@/components/category";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { savePlanChangesAction } from "./actions";
import type { Placement, PlannerSession } from "./types";

export const SNAP = 15; // minutes: moving, resizing and drawing snap to quarter hours
export const NEW_SESSION_MINUTES = 60; // a plain click into an empty slot creates one hour

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
export const snap = (minutes: number) => Math.round(minutes / SNAP) * SNAP;
export const samePlacement = (a: Placement, b: Placement) =>
  a.day === b.day && a.start === b.start && a.end === b.end && a.laneId === b.laneId;
// "HH:MM" for the Server Action and the URL (not for display).
const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// Formats wall-clock minutes (e.g. 645) as "10:45" through next-intl.
export function useTimeFormat() {
  const format = useFormatter();
  const t = useTranslations("Wochenplan");
  // Read as UTC and formatted in UTC, so nothing shifts by a time zone.
  const time = (minutes: number) =>
    format.dateTime(new Date(Date.UTC(2000, 0, 1, 0, minutes)), "time", { timeZone: "UTC" });
  const timeRange = (p: Pick<Placement, "start" | "end">) => t("timeRange", { start: time(p.start), end: time(p.end) });
  return { time, timeRange };
}

// The edit mode's state. Nothing is stored until save().
export function usePlanEditor() {
  const router = useRouter();
  // next-intl's router adds the locale to a path; for links that already have it we need Next's own.
  const nextRouter = useNextRouter();

  const [editing, setEditing] = useState(false);
  // Unsaved changes: session id -> new placement. Only holds sessions that differ from the saved plan.
  const [drafts, setDrafts] = useState<Record<string, Placement>>({});
  // While the "discard changes?" dialog is open: what to do once the user confirms.
  const [onDiscard, setOnDiscard] = useState<(() => void) | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const changeCount = Object.keys(drafts).length;
  const isDirty = changeCount > 0;

  // Where a session is shown when nobody is dragging it: the unsaved change, or the saved plan.
  const placementOf = (s: PlannerSession): Placement => drafts[s.id] ?? s;

  // Keeps a new placement as an unsaved change. Moved back to where it was saved, it's not a change any more.
  function setDraft(saved: PlannerSession, placement: Placement) {
    setDrafts((current) => {
      const next = { ...current };
      if (samePlacement(placement, saved)) delete next[saved.id];
      else next[saved.id] = placement;
      return next;
    });
  }

  function stopEditing() {
    setEditing(false);
    setDrafts({});
    setSaveFailed(false);
  }

  // Runs `action` right away, or after "Verwerfen" when there are unsaved changes.
  function confirmDiscard(action: () => void) {
    if (isDirty) setOnDiscard(() => action);
    else action();
  }

  // "Abbrechen"
  const cancel = () => confirmDiscard(stopEditing);

  // "Speichern"
  function save() {
    if (!isDirty) return stopEditing();
    const changes = Object.entries(drafts).map(([id, p]) => ({
      id,
      day: p.day,
      start: hhmm(p.start),
      end: hhmm(p.end),
      groupId: p.laneId,
    }));
    startSaving(async () => {
      const result = await savePlanChangesAction(changes);
      // The Server Action refreshes the page, so the saved times arrive as new `sessions`.
      if (result.ok) stopEditing();
      else setSaveFailed(true);
    });
  }

  // Drawing in an empty slot (or a click) opens "Neue Einheit" with day, time and group filled in.
  function openNewSession(p: Placement) {
    confirmDiscard(() =>
      router.push({
        pathname: "/einheit/neu",
        query: { tag: p.day, beginn: hhmm(p.start), ende: hhmm(p.end), ...(p.laneId && { gruppe: p.laneId }) },
      }),
    );
  }

  // --- Leaving the page with unsaved changes asks first ---
  useEffect(() => {
    if (!isDirty) return;

    // Closing the tab or reloading: the browser shows its own question.
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    // Links inside the app (e.g. the sidebar): our own dialog. This listens on
    // `window` in the capture phase, so it runs before the link navigates.
    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!link || link.getAttribute("target") || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      event.stopPropagation();
      const href = link.getAttribute("href")!;
      setOnDiscard(() => () => {
        // In case the link leads back to this page.
        setEditing(false);
        setDrafts({});
        nextRouter.push(href);
      });
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("click", onClick, true);
    };
  }, [isDirty, nextRouter]);

  return {
    editing,
    startEditing: () => setEditing(true),
    drafts,
    placementOf,
    setDraft,
    changeCount,
    cancel,
    save,
    isSaving,
    saveFailed,
    openNewSession,
    confirmDiscard,
    discardDialog: { open: onDiscard !== null, confirm: onDiscard, close: () => setOnDiscard(null) },
  };
}

export type PlanEditor = ReturnType<typeof usePlanEditor>;

// While something is dragged: follows the mouse anywhere on the page until the
// button is released. The listeners go on `window`, because the dragged block
// moves into other columns or rows (other DOM elements) and would lose the mouse otherwise.
// The handlers are kept in a ref, so they always see the latest render.
export function useDragListeners(
  active: boolean,
  handlers: { move: (event: PointerEvent) => void; up: () => void; cancel: () => void },
) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!active) return;
    const onMove = (event: PointerEvent) => latest.current.move(event);
    const onUp = () => latest.current.up();
    // Escape drops the drag and keeps everything as before.
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && latest.current.cancel();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);
}

// Moving a block with the keyboard into another day or row re-creates it in a
// new place, which loses the keyboard focus. Call `keepFocus(id)` before such a
// move; after the next render the block (marked with data-session-id) gets the focus back.
export function useKeepFocus() {
  const focusId = useRef<string | null>(null);
  useEffect(() => {
    if (!focusId.current) return;
    document.querySelector<HTMLElement>(`[data-session-id="${CSS.escape(focusId.current)}"]`)?.focus();
    focusId.current = null;
  });
  return (id: string) => {
    focusId.current = id;
  };
}

type PlanHeaderProps = {
  editor: PlanEditor;
  title: string;
  subtitle: string;
  editHint: string; // explains dragging in this view
  keyboardHint: string; // read by screen readers on every block in edit mode (id "plan-keys")
  filter?: ReactNode; // left of the toolbar, e.g. the group dropdown
  hint?: string; // right of the legend
  zoom?: ReactNode; // left of the buttons
};

// Title, toolbar (filter · legend or edit-mode bar · zoom · buttons) and the
// "discard changes?" dialog.
export function PlanHeader({ editor, title, subtitle, editHint, keyboardHint, filter, hint, zoom }: PlanHeaderProps) {
  const t = useTranslations("Wochenplan");
  const { editing, isSaving, saveFailed, changeCount, discardDialog } = editor;

  return (
    <>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-sm">{subtitle}</p>
      </div>

      <div className="flex min-h-10 items-center gap-4">
        {filter}
        {editing ? (
          <div role="status" className="flex flex-1 items-center gap-3 rounded-lg border bg-muted px-3 py-2 text-sm">
            <PencilIcon aria-hidden="true" className="size-4 shrink-0" />
            <span>
              <span className="font-semibold">{t("editModeTitle")}</span> {editHint}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-3">
              {saveFailed && (
                <span role="alert" className="flex items-center gap-1.5 font-medium text-destructive">
                  <AlertCircleIcon aria-hidden="true" className="size-4" />
                  {t("saveError")}
                </span>
              )}
              {changeCount > 0 && <Badge variant="secondary">{t("unsavedCount", { count: changeCount })}</Badge>}
            </span>
          </div>
        ) : (
          <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium">
            <CategoryLegend />
            {hint && <span className="ml-auto">{hint}</span>}
          </div>
        )}
        {zoom}
        <div className="flex shrink-0 items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={editor.cancel} disabled={isSaving}>
                <XIcon aria-hidden="true" />
                {t("cancel")}
              </Button>
              <Button onClick={editor.save} disabled={isSaving}>
                <CheckIcon aria-hidden="true" />
                {isSaving ? t("saving") : t("save")}
              </Button>
            </>
          ) : (
            <Button onClick={editor.startEditing}>
              <PencilIcon aria-hidden="true" />
              {t("edit")}
            </Button>
          )}
        </div>
      </div>

      <p id="plan-keys" className="sr-only">
        {keyboardHint}
      </p>

      <AlertDialog open={discardDialog.open} onOpenChange={(open) => !open && discardDialog.close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("discardTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {t("discardDescription", { count: changeCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keepEditing")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                discardDialog.confirm?.();
                discardDialog.close();
              }}
            >
              {t("discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// A small dark label under (or above) a block while dragging.
export function DragTip({ text, align, above }: { text: string; align: "left" | "right"; above?: boolean }) {
  return (
    <span
      role="status"
      className={[
        "absolute z-30 rounded-md bg-foreground px-2 py-1 text-xs font-medium whitespace-nowrap text-background shadow-md",
        above ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
        align === "right" ? "right-0" : "left-0",
      ].join(" ")}
    >
      {text}
    </span>
  );
}

// The dot on a session with unsaved changes.
export function ChangedDot() {
  const t = useTranslations("Wochenplan");
  return (
    <span
      role="img"
      aria-label={t("changed")}
      className="absolute top-[3px] right-[3px] size-2 rounded-full bg-primary ring-2 ring-card"
    />
  );
}
