"use client";

// Client Components: the Tag/Woche tabs, the day picker and the filter react to
// taps. Each one only changes the URL (?ansicht=…&tag=…&filter=…); the page is a
// Server Component that reads the URL and renders the matching sessions.

import { useTranslations } from "next-intl";
import { useOptimistic, useTransition, type ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { calendarHref, type CalendarState, type View } from "./calendar-params";

export type Option = { value: string; label: string; ariaLabel?: string; isToday?: boolean };

// Loads the calendar with some of its settings changed.
// useOptimistic shows the new tab/day/filter as selected right away, while the
// server renders the new sessions; once they arrive, `state` from the URL takes over.
function useCalendarNavigation(state: CalendarState) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(state);

  function navigate(change: Partial<CalendarState>) {
    const next = { ...state, ...change };
    startTransition(() => {
      setCurrent(next);
      // replace instead of push: tapping through days shouldn't fill the back button's history.
      // scroll: false keeps the controls where they are.
      router.replace(calendarHref(next), { scroll: false });
    });
  }

  return { current, navigate, isPending };
}

// Tag / Woche. `children` is the view the server rendered for the URL's `ansicht`.
export function ViewTabs({ state, children }: { state: CalendarState; children: ReactNode }) {
  const t = useTranslations("Kalender");
  const { current, navigate, isPending } = useCalendarNavigation(state);
  const views: View[] = ["tag", "woche"];

  return (
    <Tabs value={current.view} onValueChange={(view) => navigate({ view: view as View })} className="gap-4">
      {/* The group-data-… prefix is needed to beat shadcn's default height (36px) with 44px. */}
      <TabsList className="w-full group-data-[orientation=horizontal]/tabs:h-11">
        {views.map((view) => (
          <TabsTrigger key={view} value={view} className="text-base">
            {t(view === "tag" ? "day" : "week")}
          </TabsTrigger>
        ))}
      </TabsList>
      {views.map((view) =>
        view === state.view ? (
          // forceMount keeps the current view visible (dimmed) while the other one loads.
          <TabsContent
            key={view}
            value={view}
            forceMount
            aria-busy={isPending}
            className="transition-opacity data-[state=inactive]:opacity-50"
          >
            {children}
          </TabsContent>
        ) : (
          // Empty panel for the other tab, so its aria-controls points to something.
          <TabsContent key={view} value={view} />
        ),
      )}
    </Tabs>
  );
}

// Mo 12 · Di 13 · … : one button per camp day.
export function DayPicker({ state, days }: { state: CalendarState; days: Option[] }) {
  const t = useTranslations("Kalender");
  const { current, navigate } = useCalendarNavigation(state);

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={current.day}
      // Tapping the selected day again would deselect it (""): ignore that.
      onValueChange={(day) => day && navigate({ day })}
      aria-label={t("chooseDay")}
      className="w-full"
    >
      {days.map((day) => (
        <ToggleGroupItem
          key={day.value}
          value={day.value}
          aria-label={day.ariaLabel}
          className={cn(
            "h-11 min-w-0 flex-1 px-1 text-base",
            // Selected state is primary (CLAUDE.md color rules); accent is for hover only.
            "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
            // Today stays recognizable when another day is selected.
            day.isToday && "font-bold underline decoration-2 underline-offset-4",
          )}
        >
          {day.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

// "Alle Gruppen" / "Meine Einheiten" / "Gruppe Adler" …
export function CalendarFilter({ state, options }: { state: CalendarState; options: Option[] }) {
  const t = useTranslations("Kalender");
  const { current, navigate } = useCalendarNavigation(state);
  const selected = options.find((option) => option.value === current.filter);

  return (
    <Select value={current.filter} onValueChange={(filter) => navigate({ filter })}>
      <SelectTrigger aria-label={t("filter")} className="w-full bg-card text-base data-[size=default]:h-11">
        {/* Explicit label, so it shows before JavaScript has loaded. */}
        <SelectValue>{selected?.label}</SelectValue>
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
}
