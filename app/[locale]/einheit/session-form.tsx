"use client";

// Client Component: the form keeps what is typed in React state, so it can warn
// about overlaps while you edit, and calls the Server Actions to save or delete.

import { CheckIcon, CircleAlertIcon, InfoIcon, TrashIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  startTransition,
  useActionState,
  useState,
  useTransition,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
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
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { cn } from "@/lib/utils";
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
  const tDetails = useTranslations("Einheit");
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

  // The other sessions a coach is in at an overlapping time.
  // "HH:MM" strings sort like times, so plain comparisons work.
  const hasTimes = values.start !== "" && values.end !== "" && values.start < values.end;
  const overlapping = (coachId: string) =>
    hasTimes
      ? otherSessions.filter(
          (s) =>
            s.day === values.day && s.coachIds.includes(coachId) && s.start < values.end && values.start < s.end,
        )
      : [];
  // Selected coaches who are already busy: the "Überschneidung" alert.
  const conflicts = coachOptions
    .filter((coach) => values.coachIds.includes(coach.value))
    .flatMap((coach) =>
      overlapping(coach.value).map((s) => ({ key: `${coach.value}-${s.id}`, coach: coach.name, session: s })),
    );

  const hasErrors = Object.keys(errors).length > 0;
  // Error props for a field: red label/border and the message underneath.
  const invalid = (key: keyof SessionFormValues) => (errors[key] ? true : undefined);
  const errorText = (key: keyof SessionFormValues) => {
    const error = errors[key];
    return error && <FieldError>{t(error)}</FieldError>;
  };

  // shadcn's controls are 36px tall; on phones they need 44px and 16px text (no zoom on iOS).
  // On a laptop (lg) they go back to shadcn's size.
  const labelClass = "text-base lg:text-sm";
  const inputClass = "h-11 text-base md:text-base lg:h-9 lg:text-sm";
  const triggerClass = "w-full bg-card text-base data-[size=default]:h-11 lg:text-sm lg:data-[size=default]:h-9";
  // On the phone the sections are plain blocks one under another; on a laptop each one is a card.
  const sectionClass = "flex flex-col gap-6 lg:gap-4 lg:rounded-xl lg:border lg:bg-card lg:p-6 lg:shadow-sm";
  const sectionTitleClass = "hidden font-semibold leading-none lg:block";

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
          <SelectItem key={option.value} value={option.value} className="min-h-11 text-base lg:min-h-0 lg:text-sm">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  // "Abbrechen" goes back: to the details when editing, to the previous screen for a new session.
  const cancelLink = (children: ReactNode) =>
    isNew ? (
      <BackLink fallbackHref="/kalender">{children}</BackLink>
    ) : (
      // replace: like the "Einheit bearbeiten" link, so the history stays short.
      <Link href={`/einheit/${sessionId}`} replace>
        {children}
      </Link>
    );

  return (
    <div className="mx-auto w-full max-w-md lg:max-w-none">
      {/* Phone: top bar with "Abbrechen" and the title; "Speichern" is in the bar at the bottom. */}
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b px-2 py-1.5 lg:hidden">
        <Button asChild variant="ghost" className="h-11 justify-self-start text-base">
          {cancelLink(t("cancel"))}
        </Button>
        <h1 className="text-center text-base font-semibold">{t(isNew ? "newTitle" : "editTitle")}</h1>
      </header>

      {/* Laptop: breadcrumb and title, with "Abbrechen" and "Speichern" on the right. */}
      <header className="hidden items-end justify-between gap-4 px-8 pt-6 lg:flex">
        <div className="flex min-w-0 flex-col gap-2">
          <Breadcrumb aria-label={tDetails("breadcrumb")}>
            <BreadcrumbList className="text-foreground">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/kalender?ansicht=woche">{tDetails("weekPlan")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {!isNew && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={`/einheit/${sessionId}`} replace>
                        {sessionTitle}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage>{isNew ? t("newTitle") : t("editBreadcrumb")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-extrabold tracking-tight">{t(isNew ? "newTitle" : "editTitle")}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline">
            {cancelLink(
              <>
                <XIcon aria-hidden="true" />
                {t("cancel")}
              </>,
            )}
          </Button>
          {/* form="session-form": the button sits outside the form but still submits it. */}
          <Button type="submit" form="session-form" disabled={isSaving}>
            <CheckIcon aria-hidden="true" />
            {isSaving ? t("saving") : t(isNew ? "create" : "saveShort")}
          </Button>
        </div>
      </header>

      <main className="px-4 pt-5 lg:px-8 lg:pb-8">
        {/* noValidate: we show our own translated messages instead of the browser's. */}
        <form id="session-form" onSubmit={submit} noValidate className="flex flex-col gap-6 lg:gap-5">
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
              <AlertTitle className={cn("line-clamp-none", labelClass)}>{t("conflictTitle")}</AlertTitle>
              <AlertDescription className={labelClass}>
                {conflicts.map((c) => (
                  <p key={c.key}>
                    {t("conflict", { name: c.coach, title: c.session.title, group: c.session.groupLabel ?? "none" })}
                  </p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Phone: one column. Laptop: the session on the left, coaches and "löschen" on the right. */}
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-5">
            <div className="flex flex-col gap-6 lg:gap-5">
              <section aria-labelledby="section-session" className={sectionClass}>
                <h2 id="section-session" className={sectionTitleClass}>
                  {t("sectionSession")}
                </h2>
                <FieldGroup className="lg:gap-4">
                  <Field data-invalid={invalid("title")}>
                    <FieldLabel htmlFor="title" className={labelClass}>{t("title")}</FieldLabel>
                    <Input
                      id="title"
                      value={values.title}
                      onChange={(e) => set("title", e.target.value)}
                      aria-invalid={invalid("title")}
                      className={inputClass}
                    />
                    {errorText("title")}
                  </Field>

                  <div className="flex flex-col gap-7 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
                    <Field data-invalid={invalid("shortName")}>
                      <FieldLabel htmlFor="shortName" className={labelClass}>{t("shortName")}</FieldLabel>
                      <Input
                        id="shortName"
                        value={values.shortName}
                        maxLength={SHORT_NAME_MAX}
                        onChange={(e) => set("shortName", e.target.value)}
                        aria-invalid={invalid("shortName")}
                        aria-describedby="shortName-hint"
                        className={inputClass}
                      />
                      <FieldDescription id="shortName-hint" className={labelClass}>
                        {t("shortNameHint")}
                      </FieldDescription>
                      {errorText("shortName")}
                    </Field>

                    <Field data-invalid={invalid("category")}>
                      <FieldLabel htmlFor="category" className={labelClass}>{t("category")}</FieldLabel>
                      {select("category", categoryOptions, t("categoryPlaceholder"))}
                      {errorText("category")}
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="notes" className={labelClass}>{t("notes")}</FieldLabel>
                    <Textarea
                      id="notes"
                      value={values.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      className="min-h-24 bg-card text-base md:text-base lg:min-h-18 lg:text-sm"
                    />
                  </Field>
                </FieldGroup>
              </section>

              <FieldSeparator className="lg:hidden" />

              <section aria-labelledby="section-time" className={sectionClass}>
                <h2 id="section-time" className={sectionTitleClass}>
                  {t("sectionTimeAndPlace")}
                </h2>
                <FieldGroup className="lg:gap-4">
                  {/* Laptop: Tag, Beginn and Ende in one row. */}
                  <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-4">
                    <Field data-invalid={invalid("day")}>
                      <FieldLabel htmlFor="day" className={labelClass}>{t("day")}</FieldLabel>
                      {select("day", dayOptions)}
                      {errorText("day")}
                    </Field>

                    {/* lg:contents: on the laptop this wrapper disappears and both fields join the row above. */}
                    <div className="grid grid-cols-2 gap-3 lg:contents">
                      <Field data-invalid={invalid("start")}>
                        <FieldLabel htmlFor="start" className={labelClass}>{t("start")}</FieldLabel>
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
                        <FieldLabel htmlFor="end" className={labelClass}>{t("end")}</FieldLabel>
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
                  </div>

                  <div className="flex flex-col gap-7 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
                    <Field data-invalid={invalid("locationId")}>
                      <FieldLabel htmlFor="locationId" className={labelClass}>{t("location")}</FieldLabel>
                      {select("locationId", locationOptions, t("locationPlaceholder"))}
                      {errorText("locationId")}
                    </Field>

                    <Field data-invalid={invalid("group")}>
                      <FieldLabel htmlFor="group" className={labelClass}>{t("group")}</FieldLabel>
                      {select("group", groupOptions)}
                      {errorText("group")}
                    </Field>
                  </div>
                </FieldGroup>
              </section>
            </div>

            <div className="flex flex-col gap-6 lg:gap-5">
              <FieldSet className={cn(sectionClass, "gap-3 lg:gap-3")}>
                <FieldLegend className="mb-0 data-[variant=legend]:text-lg lg:data-[variant=legend]:text-base">
                  {t("coaches")}
                </FieldLegend>
                <FieldDescription className={labelClass}>{t("coachesHint")}</FieldDescription>
                <FieldGroup className="gap-1">
                  {coachOptions.map((coach) => {
                    // "frei" or "belegt" at the chosen time (only once a valid time is set).
                    const isBusy = overlapping(coach.value).length > 0;
                    return (
                      // min-h-11: each row is a 44px touch target; tapping the label ticks the box too.
                      <Field key={coach.value} orientation="horizontal" className="min-h-11 items-center lg:min-h-10">
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
                          className="size-5 lg:size-4"
                        />
                        <FieldLabel htmlFor={`coach-${coach.value}`} className={cn("flex-none", labelClass)}>
                          {coach.label}
                        </FieldLabel>
                        {hasTimes && (
                          <Badge variant={isBusy ? "destructive" : "secondary"}>
                            {isBusy ? t("coachBusy") : t("coachFree")}
                          </Badge>
                        )}
                      </Field>
                    );
                  })}
                </FieldGroup>
              </FieldSet>

              {!isNew && (
                <section aria-labelledby="section-delete" className={cn(sectionClass, "lg:gap-4")}>
                  <div className="hidden flex-col gap-2 lg:flex">
                    <h2 id="section-delete" className="leading-none font-semibold">
                      {t("delete")}
                    </h2>
                    <p className="text-sm">{t("deleteHint")}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="destructive"
                        className="h-11 w-full text-base lg:h-9 lg:w-fit lg:text-sm"
                      >
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
                </section>
              )}
            </div>
          </div>
        </form>
      </main>

      <ActionBar className="lg:hidden">
        {/* form="session-form": the button sits outside the form (in the fixed bar) but still submits it. */}
        <Button type="submit" form="session-form" size="lg" className="h-11 w-full text-base" disabled={isSaving}>
          {isSaving ? t("saving") : t(isNew ? "create" : "save")}
        </Button>
      </ActionBar>
    </div>
  );
}
