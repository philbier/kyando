import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlusIcon } from "lucide-react";
import type { DateTimeFormatOptions } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  dateInTimeZone,
  datesBetween,
  getActiveCamp,
  getCampSessions,
  getDemoContext,
  getGroups,
  getProfile,
  type SessionWithDetails,
} from "@/lib/data";
import { CalendarFilter, DayPicker, ViewTabs, type Option } from "./calendar-controls";
import type { CalendarState } from "./calendar-params";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/kalender">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Kalender" });
  return { title: t("title") };
}

// Server Component: reads the view, day and filter from the URL and renders the
// matching sessions. Only the tabs, day picker and filter are Client Components.
// Because it reads searchParams, Next.js renders this page fresh on every request.
export default async function KalenderPage({ params, searchParams }: PageProps<"/[locale]/kalender">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const t = await getTranslations("Kalender");
  const tSession = await getTranslations("Session");
  const format = await getFormatter();

  const { now, userId } = getDemoContext();
  const me = getProfile(userId);
  const camp = getActiveCamp();
  if (!me || !camp) notFound();

  const timeZone = camp.timezone;
  const today = dateInTimeZone(now, timeZone);
  const campDates = datesBetween(camp.starts_on, camp.ends_on);
  const groups = getGroups(camp);

  // --- Read the URL. Anything missing or unknown falls back to a sensible default. ---
  const param = (name: string) => (typeof query[name] === "string" ? query[name] : undefined);
  const view = param("ansicht") === "woche" ? "woche" : "tag";
  const requestedDay = param("tag");
  const day =
    requestedDay && campDates.includes(requestedDay)
      ? requestedDay
      : campDates.includes(today) ? today : campDates[0];
  // The week view shows one lens at a time (all groups at once is unreadable on
  // a phone), so it has no "alle" and falls back to "meine".
  const requestedFilter = param("filter");
  const filterValues = [...(view === "tag" ? ["alle"] : []), "meine", ...groups.map((g) => g.id)];
  const filter =
    requestedFilter && filterValues.includes(requestedFilter)
      ? requestedFilter
      : view === "tag" ? "alle" : "meine";
  const state: CalendarState = { view, day, filter };

  // --- Filter the sessions ---
  const matchesFilter = (s: SessionWithDetails) => {
    if (filter === "alle") return true;
    if (filter === "meine") return s.coaches.some((c) => c.id === me.id);
    // A group sees its own sessions and those for all groups, but not coach meetings.
    return s.group_id === filter || (s.group_id === null && !s.coaches_only);
  };
  const sessions = getCampSessions(camp).filter(matchesFilter);
  const daySessions = sessions.filter((s) => dateInTimeZone(new Date(s.starts_at), timeZone) === day);

  // "Zuletzt aktualisiert": the most recent change to one of the sessions on screen.
  // Changes from an earlier day also show the date.
  const shownSessions = view === "tag" ? daySessions : sessions;
  const lastUpdated = shownSessions.length
    ? new Date(Math.max(...shownSessions.map((s) => Date.parse(s.updated_at))))
    : null;
  const lastUpdatedLabel =
    lastUpdated &&
    (dateInTimeZone(lastUpdated, timeZone) === today
      ? t("lastUpdated", { time: format.dateTime(lastUpdated, "time", { timeZone }) })
      : t("lastUpdatedOn", {
          date: format.dateTime(lastUpdated, { day: "numeric", month: "long", timeZone }),
          time: format.dateTime(lastUpdated, "time", { timeZone }),
        }));

  // --- Labels for the controls (built here, so the Client Components stay small) ---

  // Camp dates are plain calendar days: read as UTC midnight, formatted in UTC.
  const dayFormat = (date: string, options: DateTimeFormatOptions) =>
    format.dateTime(new Date(date), { ...options, timeZone: "UTC" });

  const dayOptions: Option[] = campDates.map((date) => {
    const longDate = dayFormat(date, { weekday: "long", day: "numeric", month: "long" });
    return {
      value: date,
      // "Mo 12"
      label: t("dayButton", {
        weekday: dayFormat(date, { weekday: "short" }),
        day: dayFormat(date, { day: "numeric" }),
      }),
      // "Dienstag, 13. Oktober (heute)"
      ariaLabel: date === today ? t("today", { date: longDate }) : longDate,
      isToday: date === today,
    };
  });

  const filterOptions: Option[] = [
    ...(view === "tag" ? [{ value: "alle", label: t("allGroups") }] : []),
    { value: "meine", label: t(view === "tag" ? "onlyMine" : "mySessions") },
    ...groups.map((g) => ({ value: g.id, label: tSession("group", { name: g.name }) })),
  ];
  const lensLabel = filterOptions.find((o) => o.value === filter)?.label ?? "";

  // "Herbstlager 2026 · 12.–16. Oktober"
  const campDatesLabel = format.dateTimeRange(new Date(camp.starts_on), new Date(camp.ends_on), {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return (
    <>
      <AppHeader fullName={me.full_name} />

      <main className="flex flex-col gap-4 px-4 pt-5">
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
            <p className="text-sm">{t("subtitle", { camp: camp.name, dates: campDatesLabel })}</p>
          </div>
          {/* Only the Lagerleitung creates sessions. Hiding the button is convenience only:
              once Supabase is connected, RLS and the Server Action enforce it. */}
          {me.role === "head_organizer" && (
            <Button asChild className="h-11">
              <Link href="/einheit/neu">
                <PlusIcon aria-hidden="true" />
                {t("newSession")}
              </Link>
            </Button>
          )}
        </div>

        <ViewTabs state={state}>
          <div className="flex flex-col gap-4">
            {view === "tag" && <DayPicker state={state} days={dayOptions} />}
            <CalendarFilter state={state} options={filterOptions} />
            {view === "tag" ? (
              <DayView
                sessions={daySessions}
                myId={me.id}
                now={now}
                isToday={day === today}
                timeZone={timeZone}
              />
            ) : (
              <WeekView
                dates={campDates}
                sessions={sessions}
                lensLabel={lensLabel}
                myId={me.id}
                now={now}
                today={today}
                timeZone={timeZone}
              />
            )}
          </div>
        </ViewTabs>

        {lastUpdatedLabel && <p className="type-caption text-center">{lastUpdatedLabel}</p>}
      </main>
    </>
  );
}
