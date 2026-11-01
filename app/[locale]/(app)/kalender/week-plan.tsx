import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { Camp, SessionWithDetails } from "@/lib/data";
import { getPlanData } from "../_plan/plan-data";
import { WeekPlanner } from "./week-planner";

type WeekPlanProps = {
  camp: Camp;
  sessions: SessionWithDetails[]; // already filtered to one group or "Meine Einheiten"
  selectedGroupId: string | null; // null = "Meine Einheiten"
  now: Date;
  campDatesLabel: string; // "12.–16. Oktober"
  filter: ReactNode; // the group dropdown
};

// Server Component: the laptop Wochenplan for the Lagerleitung. It prepares the
// data here and hands it to WeekPlanner (a Client Component), which does the
// layout and editing.
export async function WeekPlan({ camp, sessions, selectedGroupId, now, campDatesLabel, filter }: WeekPlanProps) {
  const t = await getTranslations("Wochenplan");
  const plan = await getPlanData(camp, sessions, now);

  return (
    <WeekPlanner
      plan={plan}
      subtitle={t("subtitle", { camp: camp.name, dates: campDatesLabel })}
      selectedGroupId={selectedGroupId}
      filter={filter}
    />
  );
}
