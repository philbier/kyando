import { ChevronDownIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { CategoryLegend, CategoryLetter } from "@/components/category";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Link } from "@/i18n/navigation";
import type { SessionWithDetails } from "@/lib/data";
import { cn } from "@/lib/utils";

// Sessions that start and end at the same time, e.g. the four parallel 10:45 sessions.
type Slot = { startsAt: string; endsAt: string; sessions: SessionWithDetails[] };

type DayViewProps = {
  sessions: SessionWithDetails[]; // the day's sessions after the filter, ordered by start
  myId: string;
  now: Date;
  isToday: boolean;
  timeZone: string;
};

// Server Component: the list of one day's sessions, grouped by time slot.
export async function DayView({ sessions, myId, now, isToday, timeZone }: DayViewProps) {
  const t = await getTranslations("Kalender");
  const tSession = await getTranslations("Session");
  const format = await getFormatter();

  if (sessions.length === 0) {
    return <p className="type-body">{t("emptyDay")}</p>;
  }

  const slots: Slot[] = [];
  for (const s of sessions) {
    const slot = slots.find((x) => x.startsAt === s.starts_at && x.endsAt === s.ends_at);
    if (slot) slot.sessions.push(s);
    else slots.push({ startsAt: s.starts_at, endsAt: s.ends_at, sessions: [s] });
  }

  // On today, finished slots fold away under "Frühere Einheiten anzeigen".
  // On other days everything is shown, so a coach can look back at yesterday.
  const nowMs = now.getTime();
  const isPast = (slot: Slot) => isToday && Date.parse(slot.endsAt) <= nowMs;
  const pastSlots = slots.filter(isPast);
  const upcomingSlots = slots.filter((slot) => !isPast(slot));
  const pastCount = pastSlots.reduce((sum, slot) => sum + slot.sessions.length, 0);

  const time = (iso: string) => format.dateTime(new Date(iso), "time", { timeZone });

  // "Dojo (Halle B) · Gruppe Adler"
  const description = (s: SessionWithDetails) => {
    const group = s.group
      ? tSession("group", { name: s.group.name })
      : tSession(s.coaches_only ? "allCoaches" : "allGroups");
    return [s.location?.name, group].filter(Boolean).join(" · ");
  };

  const slotSection = (slot: Slot) => {
    const isNow = Date.parse(slot.startsAt) <= nowMs && nowMs < Date.parse(slot.endsAt);
    const headingId = `slot-${slot.startsAt}-${slot.endsAt}`;
    return (
      <section key={headingId} aria-labelledby={headingId} className="flex flex-col gap-2">
        <div className="flex min-h-7 items-center gap-2">
          <h2 id={headingId} className="text-base font-semibold">
            {tSession("timeRange", { start: time(slot.startsAt), end: time(slot.endsAt) })}
          </h2>
          {isNow && <Badge>{t("now")}</Badge>}
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium">{t("sessionCount", { count: slot.sessions.length })}</span>
        </div>

        {slot.sessions.map((s) => (
          // Item renders our Link as its root element (asChild), so the whole row is clickable.
          <Item key={s.id} asChild variant="outline" size="sm" className="flex-nowrap bg-card">
            <Link href={`/einheit/${s.id}`}>
              <ItemMedia>
                <CategoryLetter category={s.category} />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle className="text-base">{s.title}</ItemTitle>
                {/* line-clamp-none: titles and locations are never cut off, only wrapped. */}
                <ItemDescription className="line-clamp-none text-sm">{description(s)}</ItemDescription>
              </ItemContent>
              {s.coaches.some((c) => c.id === myId) && (
                <ItemActions>
                  <Badge variant="outline">{t("mine")}</Badge>
                </ItemActions>
              )}
            </Link>
          </Item>
        ))}
      </section>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {pastSlots.length > 0 && (
        // <details> opens and closes without any JavaScript. The `group-open:`
        // classes swap the label and turn the chevron while it is open.
        <details className="group">
          <summary
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "h-11 w-full cursor-pointer list-none justify-between text-base [&::-webkit-details-marker]:hidden",
            )}
          >
            <span className="group-open:hidden">{t("showEarlier", { count: pastCount })}</span>
            <span className="hidden group-open:inline">{t("hideEarlier")}</span>
            <ChevronDownIcon aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-4 pt-4">{pastSlots.map(slotSection)}</div>
        </details>
      )}

      {upcomingSlots.map(slotSection)}

      <div className="pt-1">
        <CategoryLegend />
      </div>
    </div>
  );
}
