import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  dateInTimeZone,
  datesBetween,
  getActiveCamp,
  getDemoContext,
  getGroups,
  getProfile,
} from "@/lib/data";
import { SessionFormPage } from "../session-form-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/einheit/neu">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "EinheitForm" });
  return { title: t("newTitle") };
}

// Server Component: "Neue Einheit", for the Lagerleitung only. The folder name
// "neu" wins over "[id]", so /einheit/neu never shows a session called "neu".
// Drawing a session in the Wochenplan or Gantt opens this page with the slot in the URL:
//   /de/einheit/neu?tag=2026-10-16&beginn=16:00&ende=17:00&gruppe=group-baeren
// Without "gruppe" (drawn under "Meine Einheiten" or in the row "Alle Gruppen") it's for all groups.
export default async function NeueEinheitPage({ params, searchParams }: PageProps<"/[locale]/einheit/neu">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;

  const { now, userId } = getDemoContext();
  const me = getProfile(userId);
  const camp = getActiveCamp();
  if (!me || !camp) notFound();

  // Coaches can't create sessions. (The Server Action checks the role again when saving.)
  if (me.role !== "head_organizer") redirect({ href: "/kalender", locale });

  // Use the slot only when every part of it makes sense; otherwise the form starts empty.
  const param = (name: string) => (typeof query[name] === "string" ? query[name] : "");
  const isTime = (value: string) => /^\d{2}:\d{2}$/.test(value);
  const slot = {
    day: param("tag"),
    start: param("beginn"),
    end: param("ende"),
    group: param("gruppe") || "alle",
  };
  const slotIsValid =
    datesBetween(camp.starts_on, camp.ends_on).includes(slot.day) &&
    isTime(slot.start) &&
    isTime(slot.end) &&
    slot.start < slot.end &&
    (slot.group === "alle" || getGroups(camp).some((g) => g.id === slot.group));

  return (
    <SessionFormPage
      camp={camp}
      session={null}
      today={dateInTimeZone(now, camp.timezone)}
      slot={slotIsValid ? slot : undefined}
    />
  );
}
