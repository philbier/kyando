import { getFormatter, getTranslations } from "next-intl/server";
import {
  categories,
  dateInTimeZone,
  datesBetween,
  getCampSessions,
  getCoaches,
  getGroups,
  getLocations,
  timeInTimeZone,
  type Camp,
  type SessionWithDetails,
} from "@/lib/data";
import type { SessionFormValues } from "./actions";
import { SessionForm, type Option, type OtherSession } from "./session-form";

// Server Component shared by "bearbeiten" and "neu": it reads the choices and
// the current values on the server and hands them to the form (a Client Component).
// The pages check the role before rendering this.
export async function SessionFormPage({
  camp,
  session,
  today,
}: {
  camp: Camp;
  session: SessionWithDetails | null; // null = new session
  today: string; // "YYYY-MM-DD", the default day for a new session
}) {
  const tSession = await getTranslations("Session");
  const tCategories = await getTranslations("Categories");
  const tRoles = await getTranslations("Roles");
  const tForm = await getTranslations("EinheitForm");
  const format = await getFormatter();
  const timeZone = camp.timezone;
  const campDates = datesBetween(camp.starts_on, camp.ends_on);

  const groupLabel = (s: SessionWithDetails) => (s.group ? tSession("group", { name: s.group.name }) : null);

  const initialValues: SessionFormValues = session
    ? {
        title: session.title,
        shortName: session.short_name,
        category: session.category,
        day: dateInTimeZone(new Date(session.starts_at), timeZone),
        start: timeInTimeZone(new Date(session.starts_at), timeZone),
        end: timeInTimeZone(new Date(session.ends_at), timeZone),
        locationId: session.location_id ?? "",
        group: session.group_id ?? (session.coaches_only ? "coaches" : "alle"),
        coachIds: session.coaches.map((c) => c.id),
        notes: session.notes ?? "",
      }
    : {
        title: "",
        shortName: "",
        category: "",
        day: campDates.includes(today) ? today : campDates[0],
        start: "",
        end: "",
        locationId: "",
        group: "alle",
        coachIds: [],
        notes: "",
      };

  const categoryOptions: Option[] = categories.map((c) => ({ value: c, label: tCategories(c) }));

  // "Dienstag, 13. Oktober". Camp dates are plain calendar days: read as UTC midnight, formatted in UTC.
  const dayOptions: Option[] = campDates.map((date) => ({
    value: date,
    label: format.dateTime(new Date(date), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
  }));

  const locationOptions: Option[] = getLocations(camp).map((l) => ({ value: l.id, label: l.name }));

  const groupOptions: Option[] = [
    { value: "alle", label: tSession("allGroups") },
    { value: "coaches", label: tSession("allCoaches") },
    ...getGroups(camp).map((g) => ({ value: g.id, label: tSession("group", { name: g.name }) })),
  ];

  // "Lena Brunner · Judo-Coach"
  const coachOptions = getCoaches().map((c) => ({
    value: c.id,
    name: c.full_name,
    label: tForm("coachLabel", { name: c.full_name, jobTitle: c.job_title ?? tRoles(c.role) }),
  }));

  // Every other session, for the overlap warning. Times are already in the camp's time zone,
  // so the browser doesn't have to convert anything.
  const otherSessions: OtherSession[] = getCampSessions(camp)
    .filter((s) => s.id !== session?.id)
    .map((s) => ({
      id: s.id,
      title: s.title,
      day: dateInTimeZone(new Date(s.starts_at), timeZone),
      start: timeInTimeZone(new Date(s.starts_at), timeZone),
      end: timeInTimeZone(new Date(s.ends_at), timeZone),
      coachIds: s.coaches.map((c) => c.id),
      groupLabel: groupLabel(s),
    }));

  return (
    <SessionForm
      sessionId={session?.id ?? null}
      sessionTitle={session?.title ?? ""}
      initialValues={initialValues}
      categoryOptions={categoryOptions}
      dayOptions={dayOptions}
      locationOptions={locationOptions}
      groupOptions={groupOptions}
      coachOptions={coachOptions}
      otherSessions={otherSessions}
    />
  );
}
