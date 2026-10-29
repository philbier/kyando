// What the Kalender shows lives in the URL, e.g.
//   /de/kalender?ansicht=tag&tag=2026-10-13&filter=alle
// so a view can be bookmarked, shared and reloaded. This file is used by the
// Server Component page (to read the URL) and the Client Components (to change it).

export type View = "tag" | "woche";

export type CalendarState = {
  view: View;
  day: string; // "YYYY-MM-DD" in the camp's time zone
  // "alle" = all groups (day view only), "meine" = my sessions, otherwise a group id
  filter: string;
};

// The link to a calendar view, in the shape next-intl's Link and router accept.
export function calendarHref({ view, day, filter }: CalendarState) {
  return {
    pathname: "/kalender",
    query: { ansicht: view, tag: day, filter },
  } as const;
}
