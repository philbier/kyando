import { getFormatter, getTranslations } from "next-intl/server";
import { CategoryLetter } from "@/components/category";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { dateInTimeZone, type Group, type SessionWithDetails } from "@/lib/data";
import { cn } from "@/lib/utils";

type Props = {
  sessions: SessionWithDetails[]; // all sessions of the camp, ordered by start time
  groups: Group[];
  myId: string;
  now: Date;
  timeZone: string;
  className?: string;
};

// "Im Lager gerade": what every group is doing right now, for the Lagerleitung's
// laptop Heute. A Server Component like the page: it only renders links, no state.
export async function CampNowCard({ sessions, groups, myId, now, timeZone, className }: Props) {
  const t = await getTranslations("Heute");
  const tSession = await getTranslations("Session");
  const format = await getFormatter();

  const nowMs = now.getTime();
  const today = dateInTimeZone(now, timeZone);
  const time = (iso: string) => format.dateTime(new Date(iso), "time", { timeZone });
  const isShared = (s: SessionWithDetails) => s.group_id === null && !s.coaches_only;

  // A group is busy with its own session, or else with one for all groups (e.g. lunch).
  const running = sessions.filter(
    (s) => Date.parse(s.starts_at) <= nowMs && nowMs < Date.parse(s.ends_at),
  );
  const rows = groups.map((group) => ({
    group,
    session: running.find((s) => s.group_id === group.id) ?? running.find(isShared),
  }));

  // The current time slot: from the earliest start to the latest end of what's running.
  const shown = rows.flatMap((r) => (r.session ? [r.session] : []));
  const slot = shown.length
    ? tSession("timeRange", {
        start: time(shown.reduce((a, b) => (a.starts_at < b.starts_at ? a : b)).starts_at),
        end: time(shown.reduce((a, b) => (a.ends_at > b.ends_at ? a : b)).ends_at),
      })
    : null;

  // "Danach": the next session for the whole camp later today.
  const after = sessions.find(
    (s) =>
      isShared(s) &&
      Date.parse(s.starts_at) > nowMs &&
      dateInTimeZone(new Date(s.starts_at), timeZone) === today,
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="type-title-sm">{t("campNow")}</CardTitle>
        <CardDescription>
          {slot
            ? t("campNowSlot", { time: slot, count: groups.length })
            : t("campNowEmpty")}
        </CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <Link href="/gantt">{t("openGantt")}</Link>
          </Button>
        </CardAction>
      </CardHeader>

      {slot && (
        <CardContent>
          <ul aria-label={t("campNowList")} className="flex flex-col">
            {rows.map(({ group, session }) => {
              const mine = session?.coaches.some((c) => c.id === myId) ?? false;
              const rowClass = cn(
                "grid min-h-11 grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-1",
                mine && "bg-muted",
              );
              return (
                <li key={group.id} className="border-t">
                  {session ? (
                    <Link
                      href={`/einheit/${session.id}`}
                      className={cn(
                        rowClass,
                        "outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      )}
                    >
                      <span className="text-sm font-semibold">{group.name}</span>
                      <span className="flex min-w-0 items-center gap-2">
                        <CategoryLetter category={session.category} className="size-5.5 rounded-sm text-[11px]" />
                        <span className="flex min-w-0 flex-col text-sm leading-[18px]">
                          <span className="font-medium">{session.title}</span>
                          {session.location && <span className="text-xs">{session.location.name}</span>}
                        </span>
                      </span>
                      {mine && <Badge variant="outline">{t("mine")}</Badge>}
                    </Link>
                  ) : (
                    <div className={rowClass}>
                      <span className="text-sm font-semibold">{group.name}</span>
                      <span className="text-sm opacity-60">{t("noSession")}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      )}

      {after && (
        <CardFooter>
          <p className="w-full border-t pt-3 text-sm">
            {/* "Danach: 12:00 – 13:15 Mittagessen · Mensa · Alle Gruppen" */}
            <span className="font-semibold">{t("after")}</span>{" "}
            {tSession("timeRange", { start: time(after.starts_at), end: time(after.ends_at) })}{" "}
            {[after.title, after.location?.name, tSession("allGroups")].filter(Boolean).join(" · ")}
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
