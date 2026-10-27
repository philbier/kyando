"use server";

// Server Action: this function runs on the server, but the login form can call
// it directly (no API route needed). The password never touches client code.

import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export type LoginState = {
  failed?: boolean;
  email?: string; // sent back so the field keeps its value after an error
};

// Prototype only: credentials are NOT checked yet. Every attempt goes straight
// to the Heute screen, which shows the dummy data from data/.
// TODO: check the credentials with Supabase Auth and return { failed: true, email } when they're wrong.
export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  // The form sends its language in a hidden field, so /fr/login leads to /fr/heute.
  // (Server Actions don't get the [locale] URL segment.) Anything unknown falls back to German.
  const requested = formData.get("locale");
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // redirect() works by throwing, so nothing after it runs.
  return redirect({ href: "/heute", locale });
}
