"use client";

// Client Component: it shows the pending state and errors while the
// Server Action `signIn` runs. useActionState holds the action's last result.

import { CircleAlertIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn, type LoginState } from "./actions";

export function LoginForm() {
  const t = useTranslations("Login");
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(signIn, {});
  const hasError = Boolean(state.failed);

  return (
    // noValidate: we show our own translated messages instead of the browser's.
    <form action={formAction} noValidate>
      {/* Tells the Server Action which language to continue in. */}
      <input type="hidden" name="locale" value={locale} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t("emailPlaceholder")}
            defaultValue={state.email}
            aria-invalid={hasError || undefined}
            className="h-11 text-base md:text-base"
          />
        </Field>

        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
            {/* TODO: password reset flow (Supabase resetPasswordForEmail) isn't built yet. */}
            <a href="#" className="text-sm font-medium underline underline-offset-4">
              {t("forgotPassword")}
            </a>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={hasError || undefined}
            className="h-11 text-base md:text-base"
          />
        </Field>

        {state.failed && (
          <p role="alert" className="flex items-start gap-2 text-sm font-medium text-destructive">
            <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t("error")}
          </p>
        )}

        <Button type="submit" size="lg" className="h-11 w-full" disabled={isPending}>
          {isPending ? t("submitting") : t("submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
