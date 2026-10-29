import type { DateTimeFormatOptions } from "next-intl";
import { getFormatter, getTranslations } from "next-intl/server";
import { CategoryLegend, categoryClasses } from "@/components/category";
import { Link } from "@/i18n/navigation";
import { dateInTimeZone, minutesInTimeZone, type SessionWithDetails } from "@/lib/data";
import { cn } from "@/lib/utils";

// The grid shows 08:00–18:00. Sessions starting at 18:00 or later go into the
// separate evening row below it.
const GRID_START = 8 * 60; // minutes since midnight
const GRID_END = 18 * 60;
const HOUR_HEIGHT = 48; // px
const PX_PER_MINUTE = HOUR_HEIGHT / 60;
const GRID_HEIGHT = ((GRID_END - GRID_START) / 60) * HOUR_HEIGHT;
const HOURS = Array.from({ length: (GRID_END - GRID_START) / 60 + 1 }, (_, i) => GRID_START / 60 + i);

// A session placed in a day column. Overlapping sessions share the column
// side by side: `lane` is the sub-column, `lanes` how many there are.
type Block = { session: SessionWithDetails; start: number; end: number; lane: number; lanes: number };

// Assigns lanes to a day's sessions (ordered by start): each session takes the
// first lane that is free again, and a run of overlapping sessions shares one lane count.
function placeInLanes(sessions: SessionWithDetails[], timeZone: string): Block[] {
  const blocks: Block[] = [];
  let run: Block[] = [];
  let laneEnds: number[] = []; // end minute of the last block in each lane of the current run

  for (const session of sessions) {
    const start = minutesInTimeZone(new Date(session.starts_at), timeZone);
    const end = minutesInTimeZone(new Date(session.ends_at), timeZone);
    if (run.length > 0 && start >= Math.max(...laneEnds)) {
      run.forEach((block) => (block.lanes = laneEnds.length));
      run = [];
      laneEnds = [];
    }
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = end;
    const block = { session, start, end, lane, lanes: 1 };
    run.push(block);
    blocks.push(block);
  }
  run.forEach((block) => (block.lanes = laneEnds.length));
  return blocks;
}

type WeekViewProps = {
  dates: string[]; // the camp days, "YYYY-MM-DD"
  sessions: SessionWithDetails[]; // the whole camp's sessions after the filter
  lensLabel: string; // "Gruppe Adler" or "Meine Einheiten", for screen readers
  myId: string;
  now: Date;
  today: string;
  timeZone: string;
};

// Server Component: Mon–Fri grid for one group or "Meine Einheiten".
// Positions are computed here and set with inline styles, because Tailwind
// can only generate classes for values it knows when the app is built.
export async function WeekView({ dates, sessions, lensLabel, myId, now, today, timeZone }: WeekViewProps) {
  const t = await getTranslations("Kalender");
  const format = await getFormatter();

  if (sessions.length === 0) {
    return <p className="type-body">{t("emptyWeek")}</p>;
  }

  // Camp dates are plain calendar days: read as UTC midnight, formatted in UTC.
  const dayFormat = (date: string, options: DateTimeFormatOptions) =>
    format.dateTime(new Date(date), { ...options, timeZone: "UTC" });
  const time = (iso: string) => format.dateTime(new Date(iso), "time", { timeZone });
  const isMine = (s: SessionWithDetails) => s.coaches.some((c) => c.id === myId);

  const days = dates.map((date) => {
    const daySessions = sessions.filter((s) => dateInTimeZone(new Date(s.starts_at), timeZone) === date);
    const startsInEvening = (s: SessionWithDetails) =>
      minutesInTimeZone(new Date(s.starts_at), timeZone) >= GRID_END;
    return {
      date,
      longLabel: dayFormat(date, { weekday: "long" }),
      blocks: placeInLanes(daySessions.filter((s) => !startsInEvening(s)), timeZone),
      evening: daySessions.filter(startsInEvening),
    };
  });

  // The evening row is labeled with the earliest evening start, e.g. "19:30".
  const startMinute = (s: SessionWithDetails) => minutesInTimeZone(new Date(s.starts_at), timeZone);
  const [earliestEvening] = days
    .flatMap((day) => day.evening)
    .sort((a, b) => startMinute(a) - startMinute(b));
  const eveningStart = earliestEvening ? time(earliestEvening.starts_at) : null;

  const nowMinute = minutesInTimeZone(now, timeZone);
  const showNowLine = dates.includes(today) && nowMinute >= GRID_START && nowMinute <= GRID_END;

  const blockLabel = (s: SessionWithDetails, dayLabel: string) =>
    t("blockLabel", {
      title: s.title,
      date: dayLabel,
      start: time(s.starts_at),
      end: time(s.ends_at),
      mine: isMine(s) ? "yes" : "no",
    });

  // Same columns in every row: the time labels, then one column per day.
  const columns = { gridTemplateColumns: `2.25rem repeat(${dates.length}, minmax(0, 1fr))` };
  const blockClasses = (s: SessionWithDetails) =>
    cn(
      "overflow-hidden rounded-sm p-1 text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
      categoryClasses[s.category],
    );
  // "10:00-11:00" in Fira Code, which is narrow enough to fit "10:00-" on one line
  // of a phone-width column; the end time wraps onto the next line.
  const timeRange = (s: SessionWithDetails) => (
    <span className="block font-mono text-[11px] leading-3 font-normal">
      {t("blockTime", { start: time(s.starts_at), end: time(s.ends_at) })}
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      <div role="region" aria-label={t("weekPlan", { lens: lensLabel })} className="flex flex-col gap-2">
        {/* Day headers: "Mo" over "12"; today's number is circled in primary. */}
        <div className="grid items-end gap-1" style={columns}>
          <span />
          {days.map(({ date }) => (
            <div key={date} className="flex flex-col items-center gap-0.5 text-xs font-medium">
              <span>{dayFormat(date, { weekday: "short" })}</span>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-base font-bold",
                  date === today && "bg-primary text-primary-foreground",
                )}
              >
                {dayFormat(date, { day: "numeric" })}
              </span>
            </div>
          ))}
        </div>

        {/* 08–18 h grid */}
        <div className="grid gap-1" style={columns}>
          <div className="relative" style={{ height: GRID_HEIGHT }}>
            {HOURS.map((hour) => (
              <span
                key={hour}
                className="absolute left-0 -translate-y-1/2 font-mono text-[11px] leading-3"
                style={{ top: (hour * 60 - GRID_START) * PX_PER_MINUTE }}
              >
                {String(hour).padStart(2, "0")}
              </span>
            ))}
          </div>

          {days.map((day) => (
            <div
              key={day.date}
              className="relative"
              // A thin line every hour.
              style={{
                height: GRID_HEIGHT,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px ${HOUR_HEIGHT}px)`,
              }}
            >
              {/* A dashed line at every half hour (08:30, 09:30, …). */}
              {HOURS.slice(0, -1).map((hour) => (
                <span
                  key={hour}
                  aria-hidden="true"
                  className="absolute inset-x-0 border-t border-dashed"
                  style={{ top: (hour * 60 + 30 - GRID_START) * PX_PER_MINUTE }}
                />
              ))}

              {day.blocks.map(({ session, start, end, lane, lanes }) => {
                // Clip to the grid, and leave 1px of space above and below each block.
                const top = (Math.max(start, GRID_START) - GRID_START) * PX_PER_MINUTE + 1;
                const height = (Math.min(end, GRID_END) - Math.max(start, GRID_START)) * PX_PER_MINUTE - 2;
                return (
                  <Link
                    key={session.id}
                    href={`/einheit/${session.id}`}
                    aria-label={blockLabel(session, day.longLabel)}
                    className={cn("absolute", blockClasses(session))}
                    style={{ top, height, left: `${(lane / lanes) * 100}%`, width: `${100 / lanes}%` }}
                  >
                    <span className="block font-semibold">{session.short_name}</span>
                    {/* The times only fit in blocks of about an hour or longer. */}
                    {height >= 44 && timeRange(session)}
                  </Link>
                );
              })}

              {showNowLine && day.date === today && (
                <span
                  role="img"
                  aria-label={t("nowLine", { time: format.dateTime(now, "time", { timeZone }) })}
                  className="absolute -inset-x-[3px] h-0.5 bg-primary"
                  style={{ top: (nowMinute - GRID_START) * PX_PER_MINUTE }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Evening program */}
        {eveningStart && (
          <div className="grid gap-1 border-t pt-2" style={columns}>
            <span className="pt-1 font-mono text-[11px] leading-3 whitespace-nowrap">{eveningStart}</span>
            {days.map((day) => (
              <div key={day.date} className="flex min-h-10 flex-col gap-1">
                {day.evening.map((session) => (
                  <Link
                    key={session.id}
                    href={`/einheit/${session.id}`}
                    aria-label={blockLabel(session, day.longLabel)}
                    className={cn("block min-h-10 font-semibold", blockClasses(session))}
                  >
                    {session.short_name}
                    {timeRange(session)}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <CategoryLegend />
      <p className="type-caption">{t("tapHint")}</p>
    </div>
  );
}
