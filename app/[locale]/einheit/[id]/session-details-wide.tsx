import { ClockIcon, MapPinIcon, NavigationIcon, PencilIcon, PhoneIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { categoryClasses, CategoryLetter } from "@/components/category";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Link } from "@/i18n/navigation";
import type { Profile, SessionWithDetails } from "@/lib/data";
import { cn, initials } from "@/lib/utils";

// Everything the page has already formatted, so both layouts show the same text.
export type SessionLabels = {
  categoryName: string; // "Judo"
  categoryLetter: string; // "J"
  timeRange: string; // "10:45 – 12:00"
  date: string; // "Dienstag, 13. Oktober"
  length: string; // "75 Min."
  remaining: string | null; // "noch 40 Min." while it's running
  startsIn: string | null; // "beginnt in 2 Std." later today
  changed: string | null; // "Zuletzt geändert von Sandra Meier, heute 07:52"
  group: string; // "Gruppe Adler", "Alle Gruppen" or "Alle Coaches"
  groupDetails: string | null; // "12 Kinder · 8–10 Jahre"
  mapsHref: string | null;
};

type Props = {
  session: SessionWithDetails;
  me: Profile;
  labels: SessionLabels;
  weekHref: string; // the Wochenplan that shows this session
  parallel: SessionWithDetails[]; // other groups' sessions at the same time
  parallelHint: string; // "9 andere Gruppen von 10:45 bis 12:00, hier die ersten drei."
};

// How many of the parallel sessions are shown; the rest are in the Gantt.
const PARALLEL_SHOWN = 3;

// Einheit details on a laptop (Lagerleitung only): breadcrumb and "Bearbeiten" on top,
// three cards for time, place and group, then notes and parallel sessions next to the coaches.
// A Server Component like the page; the page decides when it is shown.
export async function SessionDetailsWide({ session, me, labels, weekHref, parallel, parallelHint }: Props) {
  const t = await getTranslations("Einheit");
  const tSession = await getTranslations("Session");
  const tRoles = await getTranslations("Roles");
  const location = session.location;

  // One of the three cards in the row: icon, small label, value and a detail line.
  const factCard = (Icon: typeof ClockIcon, label: string, value: string, detail: ReactNode, action?: ReactNode) => (
    <Card className="py-4">
      <CardContent className="flex gap-3 px-4">
        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs font-medium">{label}</span>
          <span className="type-title-sm">{value}</span>
          {detail && <span className="text-sm">{detail}</span>}
        </div>
        {action}
      </CardContent>
    </Card>
  );

  return (
    <main className="flex flex-col gap-6 px-8 pt-6 pb-8">
      <div className="flex min-h-9 items-center justify-between gap-4">
        <Breadcrumb aria-label={t("breadcrumb")}>
          <BreadcrumbList className="text-foreground">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={weekHref}>{t("weekPlan")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={weekHref}>{labels.date}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{session.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button asChild>
          <Link href={`/einheit/${session.id}/bearbeiten`}>
            <PencilIcon aria-hidden="true" />
            {t("editShort")}
          </Link>
        </Button>
      </div>

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
            {labels.categoryLetter}
          </span>
          {labels.categoryName}
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">{session.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {labels.remaining && (
            <>
              <Badge>{t("now")}</Badge>
              <span>{labels.remaining}</span>
            </>
          )}
          {labels.startsIn && <span>{labels.startsIn}</span>}
          {(labels.remaining || labels.startsIn) && labels.changed && <span aria-hidden="true">·</span>}
          {labels.changed && <span>{labels.changed}</span>}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-4">
        {factCard(ClockIcon, t("time"), labels.timeRange, `${labels.date} · ${labels.length}`)}
        {location
          ? factCard(
              MapPinIcon,
              t("location"),
              location.name,
              location.address_hint,
              labels.mapsHref && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={labels.mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("mapLabel", { location: location.name })}
                  >
                    <NavigationIcon aria-hidden="true" />
                    {t("map")}
                  </a>
                </Button>
              ),
            )
          : // Keeps the three-card row even when no place is set.
            factCard(MapPinIcon, t("location"), t("noLocation"), null)}
        {factCard(UsersIcon, t("group"), labels.group, labels.groupDetails)}
      </div>

      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start gap-4">
        <div className="flex flex-col gap-4">
          {session.notes && (
            <Card>
              <CardHeader>
                <CardTitle>{t("notes")}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* whitespace-pre-line keeps the line breaks typed into the notes field. */}
                <p className="type-body whitespace-pre-line">{session.notes}</p>
              </CardContent>
            </Card>
          )}

          {parallel.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("parallel")}</CardTitle>
                <CardDescription>{parallelHint}</CardDescription>
                <CardAction>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/gantt">{t("openGantt")}</Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-3 gap-2">
                  {parallel.slice(0, PARALLEL_SHOWN).map((s) => (
                    <li key={s.id}>
                      <Item asChild variant="outline" size="sm" className="h-full flex-nowrap items-start">
                        <Link href={`/einheit/${s.id}`}>
                          <ItemMedia>
                            <CategoryLetter category={s.category} className="size-7 text-xs" />
                          </ItemMedia>
                          <ItemContent className="min-w-0">
                            <ItemTitle>{s.title}</ItemTitle>
                            <ItemDescription className="line-clamp-none">
                              {[s.group && tSession("group", { name: s.group.name }), s.location?.name]
                                .filter(Boolean)
                                .join(" · ")}
                            </ItemDescription>
                          </ItemContent>
                        </Link>
                      </Item>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("coaches")}</CardTitle>
            <CardDescription>{t("coachCount", { count: session.coaches.length })}</CardDescription>
          </CardHeader>
          {session.coaches.length > 0 && (
            <CardContent className="flex flex-col gap-2">
              {session.coaches.map((coach) => (
                <Item key={coach.id} variant="outline" size="sm" className="flex-nowrap">
                  <ItemMedia>
                    <Avatar>
                      <AvatarFallback>{initials(coach.full_name)}</AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <ItemTitle>{coach.id === me.id ? t("you", { name: coach.full_name }) : coach.full_name}</ItemTitle>
                    <ItemDescription className="line-clamp-none">
                      {coach.job_title ?? tRoles(coach.role)}
                    </ItemDescription>
                  </ItemContent>
                  {/* No call button for yourself or when the number is unknown. */}
                  {coach.id !== me.id && coach.phone && (
                    <ItemActions>
                      <a
                        href={`tel:${coach.phone.replace(/\s/g, "")}`}
                        aria-label={t("call", { name: coach.full_name })}
                        className={buttonVariants({ variant: "ghost", size: "icon" })}
                      >
                        <PhoneIcon aria-hidden="true" />
                      </a>
                    </ItemActions>
                  )}
                </Item>
              ))}
            </CardContent>
          )}
        </Card>
      </div>
    </main>
  );
}
