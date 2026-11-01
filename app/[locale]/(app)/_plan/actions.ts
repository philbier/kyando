"use server";

// Server Action for the laptop Wochenplan and Gantt: "Speichern" sends every
// moved or resized session at once. Anyone could call this with made-up data,
// so it checks the role and every value again.

import { revalidatePath } from "next/cache";
import {
  datesBetween,
  getActiveCamp,
  getDemoContext,
  getGroups,
  getProfile,
  getSession,
  rescheduleSession,
  zonedTimeToUtc,
} from "@/lib/data";

// One changed session. Times are wall-clock times in the camp's time zone.
export type PlanChange = {
  id: string;
  day: string; // "YYYY-MM-DD"
  start: string; // "HH:MM"
  end: string;
  groupId: string | null; // the Gantt can move a session into another group
};

export type PlanSaveResult = { ok: true } | { ok: false };

export async function savePlanChangesAction(changes: PlanChange[]): Promise<PlanSaveResult> {
  // Only the Lagerleitung may change sessions.
  // TODO: once Supabase is connected, read the user from the session cookie (RLS enforces this too).
  const { now, userId } = getDemoContext();
  const me = getProfile(userId);
  const camp = getActiveCamp();
  if (!me || !camp || me.role !== "head_organizer") return { ok: false };

  // Check everything first, so either all changes are saved or none.
  const campDates = datesBetween(camp.starts_on, camp.ends_on);
  const groupIds = getGroups(camp).map((g) => g.id);
  const isTime = (value: string) => /^\d{2}:\d{2}$/.test(value);
  const isValid = (c: PlanChange) => {
    const session = getSession(c.id);
    if (session?.camp_id !== camp.id) return false;
    // A session for all groups stays one, and a group's session can only move to another group.
    const groupIsValid =
      session.group_id === null ? c.groupId === null : c.groupId !== null && groupIds.includes(c.groupId);
    return (
      groupIsValid &&
      campDates.includes(c.day) &&
      isTime(c.start) &&
      isTime(c.end) &&
      // "HH:MM" strings sort like times, so a plain comparison works.
      c.start < c.end
    );
  };
  if (!changes.every(isValid)) return { ok: false };

  // TODO: in Supabase, run these updates in one transaction (e.g. a Postgres function called with rpc).
  for (const c of changes) {
    rescheduleSession(
      c.id,
      zonedTimeToUtc(c.day, c.start, camp.timezone),
      zonedTimeToUtc(c.day, c.end, camp.timezone),
      c.groupId,
      me.id,
      // The demo clock, so "Geändert … heute" matches the rest of the demo.
      now,
    );
  }

  // The sessions show up on Heute, Kalender, Gantt and their own pages, so refresh every page of the app.
  revalidatePath("/[locale]", "layout");
  return { ok: true };
}
