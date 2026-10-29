import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  ClockIcon,
  MapPinIcon,
  NavigationIcon,
  PencilIcon,
  PhoneIcon,
  UsersIcon,
} from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { ActionBar } from "@/components/action-bar";
import { BackLink } from "@/components/back-button";
import { categoryClasses } from "@/components/category";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { dateInTimeZone, getActiveCamp, getDemoContext, getProfile, getSession } from "@/lib/data";
import { cn, initials } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/einheit/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "Einheit" });
  return { title: getSession(id)?.title ?? t("title") };
}

// Server Component: everything is read and formatted on the server. Only the
// back button is a Client Component, because it uses the browser history.
export default async function EinheitPage({ params }: PageProps<"/[locale]/einheit/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Einheit");
  const tSession = await getTranslations("Session");
  const tCategories = await getTranslations("Categories");
  const tDuration = await getTranslations("Duration");
  const tRoles = await getTranslations("Roles");
  const format = await getFormatter();

  const { now, userId } = getDemoContext();
  const me = getProfile(userId);
  const camp = getActiveCamp();
  const session = getSession(id);
  if (!me || !camp || !session) notFound();

  const timeZone = camp.timezone;
  const startsAt = new Date(session.starts_at);
  const endsAt = new Date(session.ends_at);
  const nowMs = now.getTime();
  const isNow = startsAt.getTime() <= nowMs && nowMs < endsAt.getTime();
  const isLaterToday =
    startsAt.getTime() > nowMs && dateInTimeZone(startsAt, timeZone) === dateInTimeZone(now, timeZone);

  // "10:45", in the camp's time zone with a 24-hour clock (see i18n/request.ts)
  const time = (date: Date) => format.dateTime(date, "time", { timeZone });

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
  const groupLabel = session.group
    ? tSession("group", { name: session.group.name })
    : tSession(session.coaches_only ? "allCoaches" : "allGroups");

  // Opens the location in the phone's maps app (or Google Maps in the browser).
  const location = session.location;
  const mapsHref =
    location &&
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      [location.name, location.address_hint ?? camp.venue].filter(Boolean).join(", "),
    )}`;

  // "Geändert von Sandra Meier, heute 07:52"
  const updatedBy = session.updated_by ? getProfile(session.updated_by) : undefined;
  const updatedAt = new Date(session.updated_at);
  const changedLabel =
    updatedBy &&
    (dateInTimeZone(updatedAt, timeZone) === dateInTimeZone(now, timeZone)
      ? t("changedByToday", { name: updatedBy.full_name, time: time(updatedAt) })
      : t("changedByOn", {
          name: updatedBy.full_name,
          date: format.dateTime(updatedAt, { day: "numeric", month: "long", timeZone }),
          time: time(updatedAt),
        }));

  return (
    <>
      <header className="flex items-center gap-1 border-b px-2 py-1.5">
        <Button asChild variant="ghost" size="icon" className="size-11">
          <BackLink fallbackHref="/kalender" aria-label={t("back")}>
            <ArrowLeftIcon aria-hidden="true" className="size-5" />
          </BackLink>
        </Button>
        <span className="text-base font-semibold">{t("title")}</span>
      </header>

      <main className="flex flex-col gap-5 px-4 pt-5">
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            {/* The letter repeats the category name next to it, so screen readers skip it. */}
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 items-center justify-center rounded-sm text-xs font-bold",
                categoryClasses[session.category],
              )}
            >
              {tCategories(`letter.${session.category}`)}
            </span>
            {tCategories(session.category)}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{session.title}</h1>
          {isNow && (
            <div className="flex items-center gap-2">
              <Badge>{t("now")}</Badge>
              <span className="text-sm">{t("remaining", { duration: duration(endsAt.getTime() - nowMs) })}</span>
            </div>
          )}
          {isLaterToday && (
            <p className="text-sm">{t("startsIn", { duration: duration(startsAt.getTime() - nowMs) })}</p>
          )}
        </section>

        <Card className="py-3">
          <CardContent className="flex flex-col gap-1 px-3">
            <Item size="sm" className="flex-nowrap px-2">
              <ItemMedia variant="icon">
                <ClockIcon aria-hidden="true" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-base">
                  {t("timeAndDuration", {
                    start: time(startsAt),
                    end: time(endsAt),
                    // The length is always in minutes here ("75 Min."), like in the design.
                    duration: tDuration("minutes", {
                      minutes: Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000),
                    }),
                  })}
                </ItemTitle>
                <ItemDescription className="line-clamp-none text-base">
                  {format.dateTime(startsAt, { weekday: "long", day: "numeric", month: "long", timeZone })}
                </ItemDescription>
              </ItemContent>
            </Item>

            {location && (
              <>
                <Separator />
                <Item size="sm" className="flex-nowrap px-2">
                  <ItemMedia variant="icon">
                    <MapPinIcon aria-hidden="true" />
                  </ItemMedia>
                  {/* min-w-0 + line-clamp-none: long location names wrap instead of being cut off. */}
                  <ItemContent className="min-w-0">
                    <ItemTitle className="text-base">{location.name}</ItemTitle>
                    {location.address_hint && (
                      <ItemDescription className="line-clamp-none text-base">{location.address_hint}</ItemDescription>
                    )}
                  </ItemContent>
                  {mapsHref && (
                    <ItemActions>
                      <Button asChild variant="outline" className="h-11 text-base">
                        <a
                          href={mapsHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t("mapLabel", { location: location.name })}
                        >
                          <NavigationIcon aria-hidden="true" />
                          {t("map")}
                        </a>
                      </Button>
                    </ItemActions>
                  )}
                </Item>
              </>
            )}

            <Separator />
            <Item size="sm" className="flex-nowrap px-2">
              <ItemMedia variant="icon">
                <UsersIcon aria-hidden="true" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-base">{groupLabel}</ItemTitle>
                {session.group && (
                  <ItemDescription className="line-clamp-none text-base">
                    {t("groupDetails", { size: session.group.size, ageRange: session.group.age_range })}
                  </ItemDescription>
                )}
              </ItemContent>
            </Item>
          </CardContent>
        </Card>

        <section aria-labelledby="coaches-heading" className="flex flex-col gap-2">
          <h2 id="coaches-heading" className="type-title-sm">
            {t("coaches")}
          </h2>
          {session.coaches.length === 0 && <p className="type-body">{t("noCoaches")}</p>}
          {session.coaches.map((coach) => (
            <Item key={coach.id} variant="outline" size="sm" className="flex-nowrap bg-card">
              <ItemMedia>
                <Avatar>
                  <AvatarFallback>{initials(coach.full_name)}</AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle className="text-base">
                  {coach.id === me.id ? t("you", { name: coach.full_name }) : coach.full_name}
                </ItemTitle>
                <ItemDescription className="line-clamp-none text-base">
                  {coach.job_title ?? tRoles(coach.role)}
                </ItemDescription>
              </ItemContent>
              {/* No call button for yourself or when the number is unknown. */}
              {coach.id !== me.id && coach.phone && (
                <ItemActions>
                  <a
                    href={`tel:${coach.phone.replace(/\s/g, "")}`}
                    aria-label={t("call", { name: coach.full_name })}
                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11")}
                  >
                    <PhoneIcon aria-hidden="true" />
                  </a>
                </ItemActions>
              )}
            </Item>
          ))}
        </section>

        {session.notes ? (
          <section aria-labelledby="notes-heading" className="flex flex-col gap-2 rounded-xl bg-muted p-4">
            <h2 id="notes-heading" className="text-base font-semibold">
              {t("notes")}
            </h2>
            {/* whitespace-pre-line keeps the line breaks typed into the notes field. */}
            <p className="type-body whitespace-pre-line">{session.notes}</p>
            {changedLabel && <p className="type-caption">{changedLabel}</p>}
          </section>
        ) : (
          changedLabel && <p className="type-caption">{changedLabel}</p>
        )}
      </main>

      {/* Only the Lagerleitung edits sessions. Hiding the button is convenience only:
          the edit page and its Server Action check the role too. */}
      {me.role === "head_organizer" && (
        <ActionBar>
          <Button asChild size="lg" className="h-11 w-full text-base">
            {/* replace: the edit screen takes the place of the details in the history,
                so "back" after saving doesn't lead to the form again. */}
            <Link href={`/einheit/${session.id}/bearbeiten`} replace>
              <PencilIcon aria-hidden="true" />
              {t("edit")}
            </Link>
          </Button>
        </ActionBar>
      )}
    </>
  );
}
