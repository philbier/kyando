"use client";

// Client Component: it reacts to a click and navigates, which needs the browser.

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

// Switches the language right away by loading the same page under another
// locale (/de/profil -> /fr/profil). next-intl remembers the choice in a cookie.
// TODO: also save it to profiles.locale with a Server Action once Supabase is connected.
// `wide`: on a laptop (lg), the languages become four cards in a row, each with a
// second line ("Standard", "Französisch", …). The selected card gets a primary border.
export function LanguageRadioGroup({ wide = false }: { wide?: boolean }) {
  const t = useTranslations("LanguageSelect");
  const tProfil = useTranslations("Profil");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function changeLanguage(next: string) {
    startTransition(() => router.replace(pathname, { locale: next as Locale }));
  }

  // The language's name in the current UI language ("Französisch"); the browser's
  // Intl knows these names, so they don't need translation keys.
  const languageNames = new Intl.DisplayNames([locale], { type: "language" });

  return (
    <RadioGroup
      value={locale}
      onValueChange={changeLanguage}
      disabled={isPending}
      aria-label={tProfil("language")}
      className={cn("gap-1", wide && "lg:grid lg:grid-cols-4 lg:gap-3")}
    >
      {routing.locales.map((code) => (
        // min-h-11: each row is a 44px touch target; tapping the label selects it too.
        // On the laptop the whole card is the label, so clicking anywhere on it selects it.
        <Field
          key={code}
          orientation="horizontal"
          className={cn(
            "min-h-11 items-center",
            wide &&
              "lg:flex-row-reverse lg:justify-between lg:rounded-lg lg:border lg:bg-card lg:px-4 lg:py-3 lg:has-data-[state=checked]:border-2 lg:has-data-[state=checked]:border-primary",
          )}
        >
          <RadioGroupItem value={code} id={`lang-${code}`} />
          <FieldLabel htmlFor={`lang-${code}`} className={cn("text-base", wide && "lg:flex-col lg:items-start lg:gap-0")}>
            <span lang={code} className={cn(wide && "lg:text-sm lg:font-semibold")}>
              {t(code)}
            </span>
            {wide && (
              <span className="hidden text-xs font-normal lg:block">
                {code === routing.defaultLocale ? tProfil("languageDefault") : languageNames.of(code)}
              </span>
            )}
          </FieldLabel>
        </Field>
      ))}
    </RadioGroup>
  );
}
