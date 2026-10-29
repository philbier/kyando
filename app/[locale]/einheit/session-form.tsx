"use client";

// Client Component: the form keeps what is typed in React state, so it can warn
// about overlaps while you edit, and calls the Server Actions to save or delete.

import { CircleAlertIcon, InfoIcon, TrashIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  startTransition,
  useActionState,
  useState,
  useTransition,
  type FormEvent,
  type MouseEvent,
} from "react";
import { ActionBar } from "@/components/action-bar";
import { BackLink } from "@/components/back-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import {
  deleteSessionAction,
  saveSessionAction,
  type SessionFormState,
  type SessionFormValues,
} from "./actions";

export type Option = { value: string; label: string };

// Another session of the camp, reduced to what the overlap check needs.
export type OtherSession = {
  id: string;
  title: string;
  day: string; // "YYYY-MM-DD" in the camp's time zone
  start: string; // "HH:MM"
  end: string;
  coachIds: string[];
  groupLabel: string | null; // "Gruppe Luchse", or null for all groups / all coaches
};

type SessionFormProps = {
  sessionId: string | null; // null = new session
  sessionTitle: string; // for the delete dialog
  initialValues: SessionFormValues;
  categoryOptions: Option[];
  dayOptions: Option[];
  locationOptions: Option[];
  groupOptions: Option[];
  coachOptions: (Option & { name: string })[];
  otherSessions: OtherSession[];
};

const SHORT_NAME_MAX = 10;

export function SessionForm({
  sessionId,
  sessionTitle,
  initialValues,
  categoryOptions,
  dayOptions,
  locationOptions,
  groupOptions,
  coachOptions,
  otherSessions,
}: SessionFormProps) {
  const t = useTranslations("EinheitForm");
  const locale = useLocale();
  const [values, setValues] = useState(initialValues);
  // useActionState holds the last result of the Server Action (the errors) and
  // whether it is still running.
  const [state, saveAction, isSaving] = useActionState<
    SessionFormState,
    { locale: string; id: string | null; values: SessionFormValues }
  >(saveSessionAction, {});
  const [isDeleting, startDeleting] = useTransition();
  const [deleteForbidden, setDeleteForbidden] = useState(false);
  const errors = state.errors ?? {};
  const isNew = sessionId === null;

  // Updates one field, e.g. set("title", "Judo: Fallschule").
  function set<K extends keyof SessionFormValues>(key: K, value: SessionFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  // We call the action ourselves instead of using <form action={…}>, because
  // React clears a form after a form action, and the entries should stay when
  // there is an error.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(() => saveAction({ locale, id: sessionId, values }));
  }

  function confirmDelete(event: MouseEvent) {
    // Keep the dialog open while deleting; the action then moves on to the Kalender.
    event.preventDefault();
    if (!sessionId) return;
    startDeleting(async () => {
      const result = await deleteSessionAction({ locale, id: sessionId });
      if (result?.forbidden) setDeleteForbidden(true);
    });
  }

  // Selected coaches who are already in another session at an overlapping time.
  // "HH:MM" strings sort like times, so plain comparisons work.
  const hasTimes = values.start !== "" && values.end !== "" && values.start < values.end;
  const conflicts = hasTimes
    ? coachOptions
        .filter((coach) => values.coachIds.includes(coach.value))
        .flatMap((coach) =>
          otherSessions
            .filter(
              (s) =>
                s.day === values.day &&
                s.coachIds.includes(coach.value) &&
                s.start < values.end &&
                values.start < s.end,
            )
            .map((s) => ({ key: `${coach.value}-${s.id}`, coach: coach.name, session: s })),
        )
    : [];

  const hasErrors = Object.keys(errors).length > 0;
  // Error props for a field: red label/border and the message underneath.
  const invalid = (key: keyof SessionFormValues) => (errors[key] ? true : undefined);
  const errorText = (key: keyof SessionFormValues) => {
    const error = errors[key];
    return error && <FieldError>{t(error)}</FieldError>;
  };

  // shadcn's controls are 36px tall; on phones they need 44px and 16px text (no zoom on iOS).
  const inputClass = "h-11 text-base md:text-base";
  const triggerClass = "w-full bg-card text-base data-[size=default]:h-11";

  // A Select with its options. Radix needs a non-empty value, so "" shows the placeholder.
  const select = (key: "category" | "day" | "locationId" | "group", options: Option[], placeholder?: string) => (
    <Select value={values[key]} onValueChange={(value) => set(key, value)}>
      <SelectTrigger id={key} aria-invalid={invalid(key)} className={triggerClass}>
        <SelectValue placeholder={placeholder}>
          {options.find((o) => o.value === values[key])?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="min-h-11 text-base">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b px-2 py-1.5">
        <Button asChild variant="ghost" className="h-11 justify-self-start text-base">
          {isNew ? (
            <BackLink fallbackHref="/kalender">{t("cancel")}</BackLink>
          ) : (
            // replace: like the "Einheit bearbeiten" link, so the history stays short.
            <Link href={`/einheit/${sessionId}`} replace>
              {t("cancel")}
            </Link>
          )}
        </Button>
        <h1 className="text-center text-base font-semibold">{t(isNew ? "newTitle" : "editTitle")}</h1>
      </header>

      <main className="px-4 pt-5">
        {/* noValidate: we show our own translated messages instead of the browser's. */}
        <form id="session-form" onSubmit={submit} noValidate className="flex flex-col gap-6">
          {(state.forbidden || deleteForbidden) && (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden="true" />
              <AlertTitle className="line-clamp-none">{t("errorForbidden")}</AlertTitle>
            </Alert>
          )}
          {hasErrors && (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden="true" />
              <AlertTitle className="line-clamp-none">{t("errorSummary")}</AlertTitle>
            </Alert>
          )}
          {conflicts.length > 0 && (
            <Alert>
              <InfoIcon aria-hidden="true" />
              <AlertTitle className="line-clamp-none text-base">{t("conflictTitle")}</AlertTitle>
              <AlertDescription className="text-base">
                {conflicts.map((c) => (
                  <p key={c.key}>
                    {t("conflict", { name: c.coach, title: c.session.title, group: c.session.groupLabel ?? "none" })}
                  </p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          <FieldGroup>
            <Field data-invalid={invalid("title")}>
              <FieldLabel htmlFor="title" className="text-base">{t("title")}</FieldLabel>
              <Input
                id="title"
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                aria-invalid={invalid("title")}
                className={inputClass}
              />
              {errorText("title")}
            </Field>

            <Field data-invalid={invalid("shortName")}>
              <FieldLabel htmlFor="shortName" className="text-base">{t("shortName")}</FieldLabel>
              <Input
                id="shortName"
                value={values.shortName}
                maxLength={SHORT_NAME_MAX}
                onChange={(e) => set("shortName", e.target.value)}
                aria-invalid={invalid("shortName")}
                aria-describedby="shortName-hint"
                className={inputClass}
              />
              <FieldDescription id="shortName-hint" className="text-base">{t("shortNameHint")}</FieldDescription>
              {errorText("shortName")}
            </Field>

            <Field data-invalid={invalid("category")}>
              <FieldLabel htmlFor="category" className="text-base">{t("category")}</FieldLabel>
              {select("category", categoryOptions, t("categoryPlaceholder"))}
              {errorText("category")}
            </Field>
          </FieldGroup>

          <FieldSeparator />

          <FieldGroup>
            <Field data-invalid={invalid("day")}>
              <FieldLabel htmlFor="day" className="text-base">{t("day")}</FieldLabel>
              {select("day", dayOptions)}
              {errorText("day")}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={invalid("start")}>
                <FieldLabel htmlFor="start" className="text-base">{t("start")}</FieldLabel>
                <Input
                  id="start"
                  type="time"
                  value={values.start}
                  onChange={(e) => set("start", e.target.value)}
                  aria-invalid={invalid("start")}
                  className={inputClass}
                />
                {errorText("start")}
              </Field>
              <Field data-invalid={invalid("end")}>
                <FieldLabel htmlFor="end" className="text-base">{t("end")}</FieldLabel>
                <Input
                  id="end"
                  type="time"
                  value={values.end}
                  onChange={(e) => set("end", e.target.value)}
                  aria-invalid={invalid("end")}
                  className={inputClass}
                />
                {errorText("end")}
              </Field>
            </div>

            <Field data-invalid={invalid("locationId")}>
              <FieldLabel htmlFor="locationId" className="text-base">{t("location")}</FieldLabel>
              {select("locationId", locationOptions, t("locationPlaceholder"))}
              {errorText("locationId")}
            </Field>

            <Field data-invalid={invalid("group")}>
              <FieldLabel htmlFor="group" className="text-base">{t("group")}</FieldLabel>
              {select("group", groupOptions)}
              {errorText("group")}
            </Field>
          </FieldGroup>

          <FieldSet className="gap-3">
            <FieldLegend className="mb-0 data-[variant=legend]:text-lg">{t("coaches")}</FieldLegend>
            <FieldDescription className="text-base">{t("coachesHint")}</FieldDescription>
            <FieldGroup className="gap-1">
              {coachOptions.map((coach) => (
                // min-h-11: each row is a 44px touch target; tapping the label ticks the box too.
                <Field key={coach.value} orientation="horizontal" className="min-h-11 items-center">
                  <Checkbox
                    id={`coach-${coach.value}`}
                    checked={values.coachIds.includes(coach.value)}
                    onCheckedChange={(checked) =>
                      set(
                        "coachIds",
                        checked
                          ? [...values.coachIds, coach.value]
                          : values.coachIds.filter((id) => id !== coach.value),
                      )
                    }
                    className="size-5"
                  />
                  <FieldLabel htmlFor={`coach-${coach.value}`} className="text-base">
                    {coach.label}
                  </FieldLabel>
                </Field>
              ))}
            </FieldGroup>
          </FieldSet>

          <Field>
            <FieldLabel htmlFor="notes" className="text-base">{t("notes")}</FieldLabel>
            <Textarea
              id="notes"
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="min-h-24 bg-card text-base md:text-base"
            />
          </Field>

          {!isNew && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="h-11 w-full text-base">
                  <TrashIcon aria-hidden="true" />
                  {t("delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription className="text-base">
                    {t("deleteDescription", { title: sessionTitle })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-11 text-base" disabled={isDeleting}>
                    {t("cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    className="h-11 text-base"
                    onClick={confirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? t("deleting") : t("deleteConfirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </form>
      </main>

      <ActionBar>
        {/* form="session-form": the button sits outside the form (in the fixed bar) but still submits it. */}
        <Button type="submit" form="session-form" size="lg" className="h-11 w-full text-base" disabled={isSaving}>
          {isSaving ? t("saving") : t(isNew ? "create" : "save")}
        </Button>
      </ActionBar>
    </>
  );
}
