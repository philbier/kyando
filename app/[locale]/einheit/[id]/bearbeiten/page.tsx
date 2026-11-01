import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { dateInTimeZone, getActiveCamp, getDemoContext, getProfile, getSession } from "@/lib/data";
import { SessionFormPage } from "../../session-form-page";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/einheit/[id]/bearbeiten">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "EinheitForm" });
  return { title: t("editTitle") };
}

// Server Component: "Einheit bearbeiten", for the Lagerleitung only.
export default async function EinheitBearbeitenPage({
  params,
}: PageProps<"/[locale]/einheit/[id]/bearbeiten">) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const { now, userId } = getDemoContext();
  const me = getProfile(userId);
  const camp = getActiveCamp();
  const session = getSession(id);
  if (!me || !camp || !session) notFound();

  // Coaches only see the details. (The Server Action checks the role again when saving.)
  if (me.role !== "head_organizer") redirect({ href: `/einheit/${id}`, locale });

  return <SessionFormPage camp={camp} session={session} today={dateInTimeZone(now, camp.timezone)} />;
}
