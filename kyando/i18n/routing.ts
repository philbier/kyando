import { defineRouting } from "next-intl/routing";

// Supported languages. German is the default and the fallback for missing translations.
export const routing = defineRouting({
  locales: ["de", "fr", "it", "en"],
  defaultLocale: "de",
});

export type Locale = (typeof routing.locales)[number];
