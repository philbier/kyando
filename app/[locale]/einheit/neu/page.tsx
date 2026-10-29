import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { dateInTimeZone, getActiveCamp, getDemoContext, getProfile } from "@/lib/data";
import { SessionFormPage } from "../session-form-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/einheit/neu">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "EinheitForm" });
  return { title: t("newTitle") };
}

// Server Component: "Neue Einheit", for the Lagerleitung only. The folder name
// "neu" wins over "[id]", so /einheit/neu never shows a session called "neu".
export default async function NeueEinheitPage({ params }: PageProps<"/[locale]/einheit/neu">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { now, userId } = getDemoContext();
  const me = getProfile(userId);
  const camp = getActiveCamp();
  if (!me || !camp) notFound();

  // Coaches can't create sessions. (The Server Action checks the role again when saving.)
  if (me.role !== "head_organizer") redirect({ href: "/kalender", locale });

  return <SessionFormPage camp={camp} session={null} today={dateInTimeZone(now, camp.timezone)} />;
}
