import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSelect } from "@/components/language-select";
import { LoginForm } from "./login-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Login" });
  return { title: t("pageTitle") };
}

// Server Component: renders the static parts on the server. Only the language
// select and the form are Client Components, because they react to input.
export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Login");
  const tMeta = await getTranslations("Metadata");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-3 pb-6">
      <div className="flex justify-end">
        <LanguageSelect />
      </div>

      <div className="flex flex-col items-center gap-3 pt-12 pb-8 text-center">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-xl bg-primary text-[32px] font-extrabold text-primary-foreground"
        >
          K
        </span>
        <h1 className="type-display-lg tracking-tight">{tMeta("title")}</h1>
        <p className="type-body">{t("tagline")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>

      <p className="mt-auto pt-8 text-center text-sm">{t("noAccess")}</p>
    </main>
  );
}
