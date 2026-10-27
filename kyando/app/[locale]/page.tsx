import { redirect } from "@/i18n/navigation";

// "/de" itself has no screen: the login page is where everyone starts.
export default async function LocaleHome({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  redirect({ href: "/login", locale });
}
