"use client";

// Client Component: it needs the browser to react to a selection and navigate.

import { GlobeIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

// Switches the language by loading the same page under another locale,
// e.g. /de/login -> /fr/login. next-intl remembers the choice in a cookie.
export function LanguageSelect() {
  const t = useTranslations("LanguageSelect");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function changeLanguage(next: string) {
    startTransition(() => router.replace(pathname, { locale: next as Locale }));
  }

  return (
    <Select value={locale} onValueChange={changeLanguage} disabled={isPending}>
      <SelectTrigger aria-label={t("label")} className="w-[148px] justify-start bg-card data-[size=default]:h-11 [&>svg:last-child]:ml-auto">
        <GlobeIcon aria-hidden="true" className="text-foreground" />
        {/* Explicit label, so it shows before JavaScript has loaded. */}
        <SelectValue>{t(locale as Locale)}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {routing.locales.map((code) => (
          <SelectItem key={code} value={code} lang={code} className="min-h-11">
            {t(code)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
