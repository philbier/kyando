"use server";

// Server Actions: these functions run on the server, but the edit form calls
// them directly (no API route needed). Anyone could call them with made-up
// data, so they check the role and every value again, even though the form
// already only offers valid choices.

import { revalidatePath } from "next/cache";
import { RedirectType } from "next/navigation";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  categories,
  datesBetween,
  deleteSession,
  getActiveCamp,
  getCoaches,
  getDemoContext,
  getGroups,
  getLocations,
  getProfile,
  getSession,
  saveSession,
  zonedTimeToUtc,
} from "@/lib/data";

// What the form sends. Times are wall-clock times in the camp's time zone.
export type SessionFormValues = {
  title: string;
  shortName: string;
  category: string;
  day: string; // "YYYY-MM-DD"
  start: string; // "HH:MM"
  end: string;
  locationId: string;
  group: string; // "alle" = all groups, "coaches" = only coaches, otherwise a group id
  coachIds: string[];
  notes: string;
};

// Keys in the "EinheitForm" messages.
type ErrorKey = "errorRequired" | "errorShortNameTooLong" | "errorEndBeforeStart";

export type SessionFormState = {
  errors?: Partial<Record<keyof SessionFormValues, ErrorKey>>;
  forbidden?: boolean;
};

const SHORT_NAME_MAX = 10;

// Only the Lagerleitung may change sessions. Returns the camp and user when allowed.
// TODO: once Supabase is connected, read the user from the session cookie (RLS enforces this too).
function authorize() {
  const { now, userId } = getDemoContext();
  const me = getProfile(userId);
  const camp = getActiveCamp();
  if (!me || !camp || me.role !== "head_organizer") return null;
  return { me, camp, now };
}

function localeOrDefault(locale: string) {
  return hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
}

// Creates a session (id = null) or saves the changes to one, then shows its details.
export async function saveSessionAction(
  _previous: SessionFormState,
  { locale, id, values }: { locale: string; id: string | null; values: SessionFormValues },
): Promise<SessionFormState> {
  const allowed = authorize();
  if (!allowed) return { forbidden: true };
  const { me, camp, now } = allowed;
  if (id && !getSession(id)) return { forbidden: true };

  // --- Check every field. Unknown ids count as empty. ---
  const title = values.title.trim();
  const shortName = values.shortName.trim();
  const notes = values.notes.trim();
  const isTime = (value: string) => /^\d{2}:\d{2}$/.test(value);
  const category = categories.find((c) => c === values.category) ?? null;
  const day = datesBetween(camp.starts_on, camp.ends_on).includes(values.day) ? values.day : null;
  const location = getLocations(camp).find((l) => l.id === values.locationId);
  const group = getGroups(camp).find((g) => g.id === values.group);
  const groupIsValid = group || values.group === "alle" || values.group === "coaches";
  const coachIds = getCoaches()
    .map((c) => c.id)
    .filter((coachId) => values.coachIds.includes(coachId));

  const errors: SessionFormState["errors"] = {};
  if (!title) errors.title = "errorRequired";
  if (!shortName) errors.shortName = "errorRequired";
  else if (shortName.length > SHORT_NAME_MAX) errors.shortName = "errorShortNameTooLong";
  if (!category) errors.category = "errorRequired";
  if (!day) errors.day = "errorRequired";
  if (!isTime(values.start)) errors.start = "errorRequired";
  if (!isTime(values.end)) errors.end = "errorRequired";
  // "HH:MM" strings sort like times, so a plain comparison works.
  else if (isTime(values.start) && values.end <= values.start) errors.end = "errorEndBeforeStart";
  if (!location) errors.locationId = "errorRequired";
  if (!groupIsValid) errors.group = "errorRequired";
  if (Object.keys(errors).length > 0 || !category || !day || !location) return { errors };

  const savedId = saveSession(
    camp,
    id,
    {
      title,
      short_name: shortName,
      category,
      starts_at: zonedTimeToUtc(day, values.start, camp.timezone).toISOString(),
      ends_at: zonedTimeToUtc(day, values.end, camp.timezone).toISOString(),
      location_id: location.id,
      group_id: group?.id ?? null,
      coaches_only: values.group === "coaches",
      notes: notes || null,
    },
    coachIds,
    me.id,
    // The demo clock, so "Geändert … heute" matches the rest of the demo.
    now,
  );

  // A session shows up on Heute, Kalender and its own page, so refresh every page of the app.
  revalidatePath("/[locale]", "layout");
  // replace: the details take the place of the form in the browser history.
  // redirect() works by throwing, so nothing after it runs.
  return redirect({ href: `/einheit/${savedId}`, locale: localeOrDefault(locale) }, RedirectType.replace);
}

// Deletes a session, then goes to the Kalender.
export async function deleteSessionAction({ locale, id }: { locale: string; id: string }) {
  if (!authorize()) return { forbidden: true };

  deleteSession(id);
  revalidatePath("/[locale]", "layout");
  return redirect({ href: "/kalender", locale: localeOrDefault(locale) }, RedirectType.replace);
}
