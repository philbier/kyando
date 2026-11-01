import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getActiveCamp, getCampSessions, getDemoContext, getGroups, getProfile } from "@/lib/data";
import { getPlanData } from "../_plan/plan-data";
import { GanttPlanner } from "./gantt-planner";

export async function generateMetadata({ params }: PageProps<"/[locale]/gantt">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Gantt" });
  return { title: t("title") };
}

// Server Component: the Gantt, all groups at once, for the Lagerleitung on a laptop.
// It reads every session of the camp here; GanttPlanner (a Client Component)
// does the layout, scrolling, zoom and editing.
export default async function GanttPage({ params }: PageProps<"/[locale]/gantt">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Gantt");
  const format = await getFormatter();

  const { now, userId } = getDemoContext();
  const me = getProfile(userId);
  const camp = getActiveCamp();
  if (!me || !camp) notFound();

  // Only the Lagerleitung has the Gantt. (Saving checks the role again in the Server Action.)
  if (me.role !== "head_organizer") redirect({ href: "/kalender", locale });

  const plan = await getPlanData(camp, getCampSessions(camp), now);
  // "12.–16. Oktober". The dates are plain calendar days, so they're read as UTC midnight and formatted in UTC.
  const dates = format.dateTimeRange(new Date(camp.starts_on), new Date(camp.ends_on), {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return (
    <GanttPlanner
      plan={plan}
      subtitle={t("subtitle", { count: getGroups(camp).length, camp: camp.name, dates })}
    />
  );
}
