import type { Metadata } from "next";
import { Fira_Code, Outfit } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";

// next/font downloads the fonts at build time and serves them from our own
// domain. The CSS variables are picked up by --font-sans / --font-mono in globals.css.
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-fira-code" });

// Pre-build each page once per language (/de, /fr, /it, /en).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Lets next-intl know the locale without reading request headers,
  // so pages can be rendered statically.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${outfit.variable} ${firaCode.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* Makes translations available to Client Components (useTranslations). */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
