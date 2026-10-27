"use client";

// Client Component: it reacts to a click and navigates, which needs the browser.

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

// Switches the language right away by loading the same page under another
// locale (/de/profil -> /fr/profil). next-intl remembers the choice in a cookie.
// TODO: also save it to profiles.locale with a Server Action once Supabase is connected.
export function LanguageRadioGroup() {
  const t = useTranslations("LanguageSelect");
  const tProfil = useTranslations("Profil");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function changeLanguage(next: string) {
    startTransition(() => router.replace(pathname, { locale: next as Locale }));
  }

  return (
    <RadioGroup
      value={locale}
      onValueChange={changeLanguage}
      disabled={isPending}
      aria-label={tProfil("language")}
      className="gap-1"
    >
      {routing.locales.map((code) => (
        // min-h-11: each row is a 44px touch target; tapping the label selects it too.
        <Field key={code} orientation="horizontal" className="min-h-11 items-center">
          <RadioGroupItem value={code} id={`lang-${code}`} />
          <FieldLabel htmlFor={`lang-${code}`} lang={code} className="text-base">
            {t(code)}
          </FieldLabel>
        </Field>
      ))}
    </RadioGroup>
  );
}
