// Data shared by the laptop Wochenplan and Gantt. The server prepares it
// (plan-data.ts) and hands it to the Client Components as plain objects.

import type { Category } from "@/lib/data";

// Where a session sits: its day, its start and end in minutes since midnight
// (wall-clock time in the camp's time zone, e.g. 10:45 -> 645), and its group.
export type Placement = {
  day: string; // "YYYY-MM-DD"
  start: number;
  end: number;
  laneId: string | null; // the group's id; null = all groups (or all coaches)
};

export type PlannerSession = Placement & {
  id: string;
  title: string;
  shortName: string;
  category: Category;
  groupLabel: string; // "Gruppe Adler", "Alle Gruppen", "Alle Coaches"
  location: string | null;
};

export type PlannerDay = {
  date: string; // "YYYY-MM-DD"
  weekday: string; // "Mo"
  dayNumber: string; // "12"
  longLabel: string; // "Montag, 12. Oktober"
  shortLabel: string; // "Mo, 12. Okt."
};

export type PlannerLane = {
  id: string;
  name: string; // "Adler"
  label: string; // "Gruppe Adler"
};

export type PlanData = {
  days: PlannerDay[];
  lanes: PlannerLane[]; // every group of the camp
  sessions: PlannerSession[];
  today: string;
  nowMinute: number | null; // null = don't show the "now" line
  gridStart: number; // minutes, a full hour
  gridEnd: number;
};
