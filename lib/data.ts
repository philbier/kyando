// Dummy data for the prototype, read from the JSON files in data/.
// Each file mirrors one planned Supabase table (see "Data model" in CLAUDE.md),
// so these functions can later be replaced by supabase-js queries without
// changing the pages that call them.
// Only import this from Server Components or Server Actions: the JSON is bundled
// into whatever imports it, and it should never ship to the browser.

import campsJson from "@/data/camps.json";
import demoJson from "@/data/demo.json";
import groupsJson from "@/data/groups.json";
import locationsJson from "@/data/locations.json";
import profilesJson from "@/data/profiles.json";
import sessionCoachesJson from "@/data/session_coaches.json";
import sessionsJson from "@/data/sessions.json";

export type Role = "head_organizer" | "coach";
export type Category = "judo" | "polysport" | "gemeinsam" | "ausflug_abend";

export type Camp = {
  id: string;
  name: string;
  starts_on: string; // date, "YYYY-MM-DD"
  ends_on: string;
  timezone: string; // e.g. "Europe/Berlin"
  venue: string | null; // e.g. "Sportzentrum Sonnenberg"
  emergency_phone: string | null; // null = not set yet, Profil shows a placeholder
  is_active: boolean;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  job_title: string | null; // e.g. "Judo-Coach"; Profil falls back to the role label
  locale: string;
};

export type Group = {
  id: string;
  camp_id: string;
  name: string;
  age_range: string;
  size: number;
};

export type Location = {
  id: string;
  camp_id: string;
  name: string;
  address_hint: string | null;
};

export type Session = {
  id: string;
  camp_id: string;
  title: string;
  short_name: string;
  category: Category;
  starts_at: string; // timestamptz as ISO string in UTC
  ends_at: string;
  location_id: string | null;
  group_id: string | null; // null = all groups
  coaches_only: boolean; // e.g. the morning meeting: shown as "Alle Coaches" instead of "Alle Gruppen"
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
};

type SessionCoach = { session_id: string; coach_id: string };

// A session joined with its location, group and coaches, like a SQL query with joins would return it.
export type SessionWithDetails = Session & {
  location: Location | null;
  group: Group | null;
  coaches: Profile[];
};

// JSON imports are typed loosely (e.g. "category" is just a string), so we tell TypeScript the real shape.
const camps = campsJson as Camp[];
const profiles = profilesJson as Profile[];
const groups = groupsJson as Group[];
const locations = locationsJson as Location[];
const sessions = sessionsJson as Session[];
const sessionCoaches = sessionCoachesJson as SessionCoach[];

// Stands in for the real clock and the logged-in user until Supabase Auth is
// connected. The fixed "now" makes the Heute screen look like the design.
export function getDemoContext() {
  return { now: new Date(demoJson.now), userId: demoJson.current_user_id };
}

export function getActiveCamp(): Camp | undefined {
  return camps.find((camp) => camp.is_active);
}

export function getProfile(id: string): Profile | undefined {
  return profiles.find((profile) => profile.id === id);
}

// The camp's contact people (Lagerleitung), ordered by name.
export function getHeadOrganizers(): Profile[] {
  return profiles
    .filter((profile) => profile.role === "head_organizer")
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

// "Meine Einheiten heute": the coach's sessions on one day, ordered by start time.
// Roughly this SQL:
//   select s.* from sessions s
//   join session_coaches sc on sc.session_id = s.id
//   where s.camp_id = $1 and sc.coach_id = $2
//     and (s.starts_at at time zone camp.timezone)::date = $3
//   order by s.starts_at
export function getCoachSessionsOnDay(
  camp: Camp,
  coachId: string,
  day: string, // "YYYY-MM-DD" in the camp's time zone
): SessionWithDetails[] {
  const mySessionIds = new Set(
    sessionCoaches.filter((row) => row.coach_id === coachId).map((row) => row.session_id),
  );

  return sessions
    .filter(
      (session) =>
        session.camp_id === camp.id &&
        mySessionIds.has(session.id) &&
        dateInTimeZone(new Date(session.starts_at), camp.timezone) === day,
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .map(withDetails);
}

// The camp's groups, ordered by name.
export function getGroups(camp: Camp): Group[] {
  return groups
    .filter((group) => group.camp_id === camp.id)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// All sessions of the camp with their details, ordered by start time.
// The Kalender page filters them by day and group itself.
export function getCampSessions(camp: Camp): SessionWithDetails[] {
  return sessions
    .filter((session) => session.camp_id === camp.id)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .map(withDetails);
}

function withDetails(session: Session): SessionWithDetails {
  const coachIds = sessionCoaches
    .filter((row) => row.session_id === session.id)
    .map((row) => row.coach_id);

  return {
    ...session,
    location: locations.find((location) => location.id === session.location_id) ?? null,
    group: groups.find((group) => group.id === session.group_id) ?? null,
    coaches: profiles.filter((profile) => coachIds.includes(profile.id)),
  };
}

// The calendar date ("YYYY-MM-DD") of a moment in the given time zone.
// Used for comparing days, not for display (display goes through next-intl).
export function dateInTimeZone(date: Date, timeZone: string): string {
  // The "en-CA" locale happens to format dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Minutes since midnight of a moment in the given time zone, e.g. 10:45 -> 645.
// Used to place sessions in the week grid.
export function minutesInTimeZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return value("hour") * 60 + value("minute");
}

// Whole days from one "YYYY-MM-DD" date to another, e.g. ("2026-10-12", "2026-10-13") -> 1.
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

// Every date from `from` to `to` (both included), e.g. the days of a camp.
export function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let i = 0; i <= daysBetween(from, to); i++) {
    dates.push(new Date(Date.parse(from) + i * 86_400_000).toISOString().slice(0, 10));
  }
  return dates;
}
