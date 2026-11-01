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
import {
  getActiveCamp,
  getCoaches,
  getDemoContext,
  getGroups,
  getHeadOrganizers,
  getProfile,
} from "@/lib/data";
import { cn, initials } from "@/lib/utils";
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
  const groups = getGroups(camp);

  // On a laptop (lg and wider), the Lagerleitung gets a wider layout: "Konto" and the
  // camp side by side, then "Sprache" as four cards in a row. The `order` classes
  // move the cards into that order; on the phone they stay in the order written here.
  const isOrganizer = me.role === "head_organizer";
  const wide = (classes: string) => (isOrganizer ? classes : "");

  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-6",
        wide("lg:mx-0 lg:grid lg:max-w-[960px] lg:grid-cols-2 lg:gap-5 lg:px-8 lg:pt-8 lg:pb-10"),
      )}
    >
      <div className={cn("flex flex-col gap-1", wide("lg:col-span-2 lg:mb-1"))}>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
        {isOrganizer && <p className="hidden text-sm lg:block">{t("subtitle")}</p>}
      </div>

      {/* "Konto": a plain row on the phone, a card on the laptop. */}
      <Card
        className={cn(
          "gap-0 border-0 bg-transparent py-0 shadow-none",
          wide("lg:order-1 lg:gap-6 lg:border lg:bg-card lg:py-6 lg:shadow-sm"),
        )}
      >
        {isOrganizer && (
          <CardHeader className="hidden lg:grid">
            <CardTitle>{t("account")}</CardTitle>
          </CardHeader>
        )}
        <CardContent className={cn("flex items-center gap-4 px-0", wide("lg:px-6"))}>
          <Avatar size="lg">
            <AvatarFallback>{initials(me.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col items-start gap-1">
            <span className="type-title-sm">{me.full_name}</span>
            {/* break-all: a long email address wraps instead of widening the page. */}
            <span className="text-sm break-all">{me.email}</span>
            <Badge variant="secondary">{me.job_title ?? tRoles(me.role)}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className={wide("lg:order-3 lg:col-span-2")}>
        <CardHeader>
          <CardTitle className={cn("text-lg", wide("lg:text-base"))}>{t("language")}</CardTitle>
          <CardDescription className={cn("text-base", wide("lg:text-sm"))}>{t("languageHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageRadioGroup wide={isOrganizer} />
        </CardContent>
      </Card>

      <Card className={wide("lg:order-2")}>
        <CardHeader>
          <CardTitle className={cn("text-lg", wide("lg:text-base"))}>{camp.name}</CardTitle>
          <CardDescription className={cn("text-base", wide("lg:text-sm"))}>
            {camp.venue ? t("campDetails", { dates: campDates, venue: camp.venue }) : campDates}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className={cn("grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-base", wide("lg:text-sm"))}>
            <dt className="font-semibold">{t("headOrganizer")}</dt>
            <dd>{format.list(headOrganizers.map((p) => p.full_name))}</dd>
            {groups.length > 0 && (
              <>
                <dt className="font-semibold">{t("groups")}</dt>
                <dd>
                  {t("groupsValue", {
                    count: groups.length,
                    first: groups[0].name,
                    last: groups[groups.length - 1].name,
                  })}
                </dd>
              </>
            )}
            <dt className="font-semibold">{t("coaches")}</dt>
            <dd>{t("coachesValue", { count: getCoaches().length })}</dd>
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
      <Button
        asChild
        variant="outline"
        size="lg"
        className={cn("h-11 w-full", wide("lg:order-4 lg:col-span-2 lg:h-9 lg:w-fit lg:px-4"))}
      >
        <Link href="/login">
          <LogOutIcon aria-hidden="true" />
          {t("signOut")}
        </Link>
      </Button>
    </main>
  );
}
