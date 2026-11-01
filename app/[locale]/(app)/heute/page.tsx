import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CheckIcon,
  ChevronRightIcon,
  MapPinIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Link } from "@/i18n/navigation";
import {
  dateInTimeZone,
  daysBetween,
  getActiveCamp,
  getCampSessions,
  getCoachSessionsOnDay,
  getDemoContext,
  getGroups,
  getProfile,
  type SessionWithDetails,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { CampNowCard } from "./camp-now-card";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/heute">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Heute" });
  return { title: t("pageTitle") };
}

// Server Component: all data is read and formatted on the server, so the
// browser only receives finished HTML (no JavaScript needed for this screen).
export default async function HeutePage({ params }: PageProps<"/[locale]/heute">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Heute");
  const tSession = await getTranslations("Session");
  const tDuration = await getTranslations("Duration");
  const format = await getFormatter();

  const { now, userId } = getDemoContext();
  const me = getProfile(userId);
  const camp = getActiveCamp();
  if (!me || !camp) notFound();

  // On a laptop (lg and wider), the Lagerleitung gets a two-column layout: their own
  // sessions on the left (the same as on the phone), "Im Lager gerade" on the right.
  // The server doesn't know the screen size, so CSS classes with "lg:" switch the layout.
  const isOrganizer = me.role === "head_organizer";

  const timeZone = camp.timezone;
  const today = dateInTimeZone(now, timeZone);
  const sessions = getCoachSessionsOnDay(camp, me.id, today);

  // Split the day into the sections of the screen. Each one only shows when it has sessions.
  const nowMs = now.getTime();
  const done = sessions.filter((s) => Date.parse(s.ends_at) <= nowMs);
  const current = sessions.find(
    (s) => Date.parse(s.starts_at) <= nowMs && nowMs < Date.parse(s.ends_at),
  );
  const [next, ...later] = sessions.filter(
    (s) => s !== current && Date.parse(s.ends_at) > nowMs,
  );

  // "Tag 2 von 5" (only while the camp is running)
  const dayOfCamp = daysBetween(camp.starts_on, today) + 1;
  const campDays = daysBetween(camp.starts_on, camp.ends_on) + 1;
  const dateLabel = format.dateTime(now, { weekday: "long", day: "numeric", month: "long", timeZone });

  // "Zuletzt aktualisiert": the most recent change to one of today's sessions.
  const lastUpdated = sessions.length
    ? new Date(Math.max(...sessions.map((s) => Date.parse(s.updated_at))))
    : null;
  const lastUpdatedLabel =
    lastUpdated && t("lastUpdated", { time: format.dateTime(lastUpdated, "time", { timeZone }) });

  // The other coaches on the current session (not me).
  const coCoaches = current?.coaches.filter((c) => c.id !== me.id) ?? [];

  // --- Small formatting helpers ---

  // "10:45", in the camp's time zone with a 24-hour clock (see i18n/request.ts)
  const time = (iso: string) => format.dateTime(new Date(iso), "time", { timeZone });

  // "40 Min.", "2 Std.", "1 Std. 15 Min."
  const duration = (ms: number) => {
    const total = Math.ceil(ms / 60_000);
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    if (hours === 0) return tDuration("minutes", { minutes });
    if (minutes === 0) return tDuration("hours", { hours });
    return tDuration("hoursMinutes", { hours, minutes });
  };

  // "Gruppe Adler", "Alle Gruppen" or "Alle Coaches"
  const groupLabel = (s: SessionWithDetails) => {
    if (s.group) return tSession("group", { name: s.group.name });
    return s.coaches_only ? tSession("allCoaches") : tSession("allGroups");
  };

  // "Dojo (Halle B) · Gruppe Luchse"
  const description = (s: SessionWithDetails) =>
    [s.location?.name, groupLabel(s)].filter(Boolean).join(" · ");

  // The second line of a fact in the "Jetzt" card: after " · " on the phone,
  // on its own line in the laptop's three columns.
  const factDetail = (text: string) => (
    <>
      <span className={cn(isOrganizer && "lg:hidden")}> · </span>
      <span className={cn(isOrganizer && "lg:block")}>{text}</span>
    </>
  );

  // One row in "Als Nächstes" / "Später heute": a link to the session.
  // Item renders our Link as its root element (asChild), so the whole row is clickable.
  const sessionRow = (s: SessionWithDetails) => (
    <Item key={s.id} asChild variant="outline" className="flex-nowrap bg-card">
      <Link href={`/einheit/${s.id}`}>
        <ItemMedia className="w-12 flex-col items-start gap-0 text-sm">
          <span className="font-semibold">{time(s.starts_at)}</span>
          <span className="text-xs">{time(s.ends_at)}</span>
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemTitle>{s.title}</ItemTitle>
          {/* line-clamp-none: titles and locations are never cut off, only wrapped. */}
          <ItemDescription className="line-clamp-none">{description(s)}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <ChevronRightIcon aria-hidden="true" className="size-4" />
        </ItemActions>
      </Link>
    </Item>
  );

  return (
    <div className={cn("mx-auto w-full max-w-md", isOrganizer && "lg:max-w-none")}>
      {/* On a laptop the sidebar replaces the header. */}
      <div className={cn(isOrganizer && "lg:hidden")}>
        <AppHeader fullName={me.full_name} />
      </div>

      <main className={cn("flex flex-col gap-6 px-4 pt-5", isOrganizer && "lg:px-8 lg:pt-6 lg:pb-8")}>
        <section className="flex flex-col gap-1">
          <p className="text-sm font-medium">
            {dayOfCamp >= 1 && dayOfCamp <= campDays
              ? t("dayOfCamp", { date: dateLabel, day: dayOfCamp, days: campDays })
              : dateLabel}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="text-sm">
            {t("summary", { total: sessions.length, done: done.length, camp: camp.name })}
          </p>
        </section>

        <div
          className={cn(
            "flex flex-col gap-6",
            isOrganizer && "lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start",
          )}
        >
          {/* Left on the laptop: my own sessions, the same sections as on the phone. */}
          <div className="flex flex-col gap-6">
            {sessions.length === 0 && <p className="type-body">{t("empty")}</p>}

            {current && (
              <Link
                href={`/einheit/${current.id}`}
                aria-label={t("currentLink", { title: current.title })}
                className="block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge>{t("now")}</Badge>
                      <span className="font-semibold">
                        {tSession("timeRange", { start: time(current.starts_at), end: time(current.ends_at) })}
                      </span>
                      <span className="ml-auto">
                        {t("remaining", { duration: duration(Date.parse(current.ends_at) - nowMs) })}
                      </span>
                    </div>
                    <CardTitle className="text-2xl">{current.title}</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {/* Location, group and co-coaches: listed on the phone, three columns on the laptop. */}
                    <ul
                      className={cn(
                        "flex flex-col gap-3 text-base",
                        isOrganizer && "lg:grid lg:grid-cols-3 lg:gap-4 lg:text-sm",
                      )}
                    >
                      {current.location && (
                        <li className="flex items-start gap-3">
                          <MapPinIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                          <span>
                            <span className="font-semibold">{current.location.name}</span>
                            {current.location.address_hint && (
                              <>
                                <br />
                                {current.location.address_hint}
                              </>
                            )}
                          </span>
                        </li>
                      )}
                      <li className="flex items-start gap-3">
                        <UsersIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                        <span>
                          <span className="font-semibold">{groupLabel(current)}</span>
                          {current.group &&
                            factDetail(t("groupDetails", { size: current.group.size, ageRange: current.group.age_range }))}
                        </span>
                      </li>
                      {coCoaches.length > 0 && (
                        <li className="flex items-start gap-3">
                          <UserIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                          <span>
                            <span className="font-semibold">
                              {t("withCoaches", { names: format.list(coCoaches.map((c) => c.full_name)) })}
                            </span>
                            {/* "Polysport-Coach", only when there is one co-coach with a job title. */}
                            {coCoaches.length === 1 && coCoaches[0].job_title && factDetail(coCoaches[0].job_title)}
                          </span>
                        </li>
                      )}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <div className="flex w-full items-center justify-between border-t pt-3 text-sm font-medium">
                      {t("details")}
                      <ChevronRightIcon aria-hidden="true" className="size-4" />
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            )}

            {next && (
              <section aria-labelledby="next-heading" className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 id="next-heading" className="type-title-sm">
                    {t("next")}
                  </h2>
                  {Date.parse(next.starts_at) > nowMs && (
                    <span className="text-sm font-medium">
                      {t("startsIn", { duration: duration(Date.parse(next.starts_at) - nowMs) })}
                    </span>
                  )}
                </div>
                {sessionRow(next)}
              </section>
            )}

            {/* "Später heute" and "Erledigt": one under the other on the phone, side by side on the laptop. */}
            <div
              className={cn(
                "flex flex-col gap-6 empty:hidden",
                isOrganizer && "lg:grid lg:grid-cols-2 lg:items-start",
              )}
            >
              {later.length > 0 && (
                <section aria-labelledby="later-heading" className="flex flex-col gap-2">
                  <h2 id="later-heading" className="type-title-sm">
                    {t("later")}
                  </h2>
                  {later.map(sessionRow)}
                </section>
              )}

              {done.length > 0 && (
                <section aria-labelledby="done-heading" className="flex flex-col gap-2">
                  <h2 id="done-heading" className="type-title-sm">
                    {t("done")}
                  </h2>
                  {/* Finished sessions are faded and not links. */}
                  <div className="flex flex-col gap-2 opacity-60">
                    {done.map((s) => (
                      <Item key={s.id} variant="muted" size="sm" className="flex-nowrap">
                        <ItemMedia className="w-12 items-start text-sm font-semibold">
                          {time(s.starts_at)}
                        </ItemMedia>
                        <ItemContent className="min-w-0">
                          <ItemTitle>{s.title}</ItemTitle>
                          <ItemDescription className="line-clamp-none">{description(s)}</ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <CheckIcon role="img" aria-label={t("done")} className="size-4" />
                        </ItemActions>
                      </Item>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Right on the laptop: what the whole camp is doing right now.
              Only for the Lagerleitung, and not on the phone. */}
          {isOrganizer && (
            <CampNowCard
              sessions={getCampSessions(camp)}
              groups={getGroups(camp)}
              myId={me.id}
              now={now}
              timeZone={timeZone}
              className="hidden lg:flex"
            />
          )}
        </div>

        {/* On a laptop, the layout shows "Zuletzt aktualisiert" in the bottom right corner instead. */}
        {lastUpdatedLabel && (
          <p className={cn("type-caption text-center", isOrganizer && "lg:hidden")}>{lastUpdatedLabel}</p>
        )}
      </main>
    </div>
  );
}
