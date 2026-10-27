"use client";

// Client Component: it needs the current URL (usePathname) to highlight the
// active tab, and that is only available in the browser-side React tree.

import { CalendarIcon, HouseIcon, UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/heute", key: "heute", Icon: HouseIcon },
  { href: "/kalender", key: "kalender", Icon: CalendarIcon },
  { href: "/profil", key: "profil", Icon: UserIcon },
] as const;

export function BottomNav() {
  const t = useTranslations("Navigation");
  // Path without the locale, e.g. "/heute" (not "/de/heute").
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 px-2 pt-2">
        {items.map(({ href, key, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={key}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-13 flex-col items-center gap-1 rounded-md text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                isActive ? "font-semibold" : "font-medium",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full",
                  isActive && "bg-primary text-primary-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
              </span>
              {t(key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
