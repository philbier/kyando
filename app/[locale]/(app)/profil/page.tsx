import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getActiveCamp, getDemoContext, getHeadOrganizers, getProfile } from "@/lib/data";
import { initials } from "@/lib/utils";
import { LanguageRadioGroup } from "./language-radio-group";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/profil">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Profil" });
  return { title: t("title") };
}

// Server Component: the profile and camp info are read on the server. Only the
// language picker is a Client Component, because it reacts to clicks.
export default async function ProfilPage({ params }: PageProps<"/[locale]/profil">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Profil");
  const tRoles = await getTranslations("Roles");
  const format = await getFormatter();

  const { userId } = getDemoContext();
  const me = getProfile(userId);
  const camp = getActiveCamp();
  if (!me || !camp) notFound();

  // "12.–16. Oktober". The dates are plain calendar days, so they're read as
  // UTC midnight and formatted in UTC to avoid shifting by a day.
  const campDates = format.dateTimeRange(new Date(camp.starts_on), new Date(camp.ends_on), {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const headOrganizers = getHeadOrganizers();

  return (
    <main className="flex flex-col gap-4 px-4 pt-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>

      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarFallback>{initials(me.full_name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <span className="type-title-sm">{me.full_name}</span>
          {/* break-all: a long email address wraps instead of widening the page. */}
          <span className="text-sm break-all">{me.email}</span>
          <Badge variant="secondary">{me.job_title ?? tRoles(me.role)}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("language")}</CardTitle>
          <CardDescription className="text-base">{t("languageHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageRadioGroup />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{camp.name}</CardTitle>
          <CardDescription className="text-base">
            {camp.venue ? t("campDetails", { dates: campDates, venue: camp.venue }) : campDates}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-base">
            <dt className="font-semibold">{t("headOrganizer")}</dt>
            <dd>{format.list(headOrganizers.map((p) => p.full_name))}</dd>
            <dt className="font-semibold">{t("emergency")}</dt>
            <dd>
              {camp.emergency_phone ? (
                <a href={`tel:${camp.emergency_phone}`} className="underline underline-offset-4">
                  {camp.emergency_phone}
                </a>
              ) : (
                // No number in the data yet: show the placeholder from the design (not a link).
                <span className="underline underline-offset-4">{t("emergencyPlaceholder")}</span>
              )}
            </dd>
          </dl>
        </CardContent>
      </Card>

      {/* Prototype: there is no real session yet, so signing out just goes back to the login screen.
          TODO: call supabase.auth.signOut() in a Server Action, then redirect. */}
      <Button asChild variant="outline" size="lg" className="h-11 w-full">
        <Link href="/login">
          <LogOutIcon aria-hidden="true" />
          {t("signOut")}
        </Link>
      </Button>
    </main>
  );
}
