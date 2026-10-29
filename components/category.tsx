import { useTranslations } from "next-intl";
import type { Category } from "@/lib/data";
import { cn } from "@/lib/utils";

// Colors of the activity categories (see "Design system" in CLAUDE.md).
// A color is always paired with a text label: a letter or the legend.
export const categoryClasses: Record<Category, string> = {
  judo: "bg-chart-2 text-primary-foreground",
  polysport: "bg-chart-3 text-accent-foreground",
  gemeinsam: "border bg-muted text-foreground",
  ausflug_abend: "bg-chart-5 text-accent-foreground",
};

const categories = Object.keys(categoryClasses) as Category[];

// The colored square with the category's letter ("J" for Judo).
export function CategoryLetter({ category }: { category: Category }) {
  const t = useTranslations("Categories");
  return (
    <span
      role="img"
      aria-label={t(category)}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-sm font-bold",
        categoryClasses[category],
      )}
    >
      {t(`letter.${category}`)}
    </span>
  );
}

// "■ Judo  ■ Polysport  …"
export function CategoryLegend() {
  const t = useTranslations("Categories");
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium">
      {categories.map((category) => (
        <li key={category} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("size-3 shrink-0 rounded-[3px]", categoryClasses[category])} />
          {t(category)}
        </li>
      ))}
    </ul>
  );
}
