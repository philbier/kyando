import { getFormatter, getTranslations } from "next-intl/server";
import { dateInTimeZone, getCampSessions, type Camp } from "@/lib/data";
import { cn } from "@/lib/utils";

// "Zuletzt aktualisiert um 11:18": the most recent change to any session of the camp.
// Changes from an earlier day also show the date.
// A Server Component: it reads the data on the server and renders plain text.
export async function LastUpdated({ camp, now, className }: { camp: Camp; now: Date; className?: string }) {
  const t = await getTranslations("Kalender");
  const format = await getFormatter();
  const timeZone = camp.timezone;

  const sessions = getCampSessions(camp);
  if (sessions.length === 0) return null;
  const lastUpdated = new Date(Math.max(...sessions.map((s) => Date.parse(s.updated_at))));

  const time = format.dateTime(lastUpdated, "time", { timeZone });
  const label =
    dateInTimeZone(lastUpdated, timeZone) === dateInTimeZone(now, timeZone)
      ? t("lastUpdated", { time })
      : t("lastUpdatedOn", { date: format.dateTime(lastUpdated, { day: "numeric", month: "long", timeZone }), time });

  return <p className={cn("text-xs font-medium", className)}>{label}</p>;
}
