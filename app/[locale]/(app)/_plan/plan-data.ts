import type { DateTimeFormatOptions } from "next-intl";
import { getFormatter, getTranslations } from "next-intl/server";
import {
  dateInTimeZone,
  datesBetween,
  getGroups,
  minutesInTimeZone,
  type Camp,
  type SessionWithDetails,
} from "@/lib/data";
import type { PlanData } from "./types";

// Each day shows at least 08:00–21:30 (the evening program included), and
// grows when a session starts earlier or ends later.
const DEFAULT_START = 8 * 60; // minutes since midnight
const DEFAULT_END = 21 * 60 + 30;

// Server only: turns sessions into the plain data the Wochenplan and Gantt
// (Client Components) need, with every label already translated and formatted.
export async function getPlanData(
  camp: Camp,
  sessions: SessionWithDetails[],
  now: Date,
): Promise<PlanData> {
  const tSession = await getTranslations("Session");
  const format = await getFormatter();
  const timeZone = camp.timezone;
  const minutes = (iso: string) => minutesInTimeZone(new Date(iso), timeZone);
  const today = dateInTimeZone(now, timeZone);

  // Camp dates are plain calendar days: read as UTC midnight, formatted in UTC.
  const dayFormat = (date: string, options: DateTimeFormatOptions) =>
    format.dateTime(new Date(date), { ...options, timeZone: "UTC" });
  const days = datesBetween(camp.starts_on, camp.ends_on).map((date) => ({
    date,
    weekday: dayFormat(date, { weekday: "short" }),
    dayNumber: dayFormat(date, { day: "numeric" }),
    longLabel: dayFormat(date, { weekday: "long", day: "numeric", month: "long" }),
    shortLabel: dayFormat(date, { weekday: "short", day: "numeric", month: "short" }),
  }));

  const lanes = getGroups(camp).map((g) => ({ id: g.id, name: g.name, label: tSession("group", { name: g.name }) }));

  const planSessions = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    shortName: s.short_name,
    category: s.category,
    laneId: s.group_id,
    groupLabel: s.group
      ? tSession("group", { name: s.group.name })
      : tSession(s.coaches_only ? "allCoaches" : "allGroups"),
    location: s.location?.name ?? null,
    day: dateInTimeZone(new Date(s.starts_at), timeZone),
    start: minutes(s.starts_at),
    end: minutes(s.ends_at),
  }));

  // Full hours, so the hour lines line up with the labels.
  const gridStart = Math.min(DEFAULT_START, ...planSessions.map((s) => Math.floor(s.start / 60) * 60));
  const gridEnd = Math.max(DEFAULT_END, ...planSessions.map((s) => s.end));

  const nowMinute = minutesInTimeZone(now, timeZone);
  const showNowLine = days.some((d) => d.date === today) && nowMinute >= gridStart && nowMinute <= gridEnd;

  return {
    days,
    lanes,
    sessions: planSessions,
    today,
    nowMinute: showNowLine ? nowMinute : null,
    gridStart,
    gridEnd,
  };
}
