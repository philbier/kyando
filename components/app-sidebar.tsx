"use client";

// Client Component: it needs the current URL (usePathname) to highlight the
// active item, like the bottom navigation.

import {
  CalendarIcon,
  ChartGanttIcon,
  HouseIcon,
  LogOutIcon,
  MapPinIcon,
  ShapesIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/navigation";
import { cn, initials } from "@/lib/utils";

type Item = {
  key: "heute" | "kalender" | "gantt" | "profil" | "coaches" | "gruppen" | "orte";
  Icon: LucideIcon;
  href?: string;
};

const campItems: Item[] = [
  // The Lagerleitung's start page: their own sessions plus "Im Lager gerade".
  { key: "heute", Icon: HouseIcon, href: "/heute" },
  // The Lagerleitung works with the whole week on a laptop.
  { key: "kalender", Icon: CalendarIcon, href: "/kalender?ansicht=woche" },
  { key: "gantt", Icon: ChartGanttIcon, href: "/gantt" },
  { key: "profil", Icon: UserIcon, href: "/profil" },
];
// No screens yet: shown, but disabled.
const adminItems: Item[] = [
  { key: "coaches", Icon: UsersIcon },
  { key: "gruppen", Icon: ShapesIcon },
  { key: "orte", Icon: MapPinIcon },
];

type AppSidebarProps = {
  campName: string;
  fullName: string;
  roleLabel: string; // "Lagerleitung"
  className?: string;
};

// The Lagerleitung's navigation on a laptop (instead of the bottom navigation).
export function AppSidebar({ campName, fullName, roleLabel, className }: AppSidebarProps) {
  const t = useTranslations("Navigation");
  const tMeta = useTranslations("Metadata");
  const pathname = usePathname();

  const menu = (items: Item[]) => (
    <SidebarMenu>
      {items.map(({ key, Icon, href }) => {
        const isActive = !!href && pathname.startsWith(href.split("?")[0]);
        return (
          <SidebarMenuItem key={key}>
            {href ? (
              <SidebarMenuButton
                asChild
                isActive={isActive}
                // Selected state is primary (CLAUDE.md color rules); accent stays for hover.
                className="h-9 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
              >
                <Link href={href} aria-current={isActive ? "page" : undefined}>
                  <Icon aria-hidden="true" />
                  <span>{t(key)}</span>
                </Link>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton disabled className="h-9">
                <Icon aria-hidden="true" />
                <span>{t(key)}</span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="none" className={cn("border-r", className)}>
      <SidebarHeader>
        {/* Camp name. TODO: becomes a camp switcher once there is more than one camp. */}
        <div className="flex items-center gap-2 p-2">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xl font-extrabold text-primary-foreground"
          >
            K
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="font-extrabold tracking-tight">{tMeta("title")}</span>
            <span className="text-xs font-medium">{campName}</span>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground">{t("camp")}</SidebarGroupLabel>
          <SidebarGroupContent>{menu(campItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground">{t("admin")}</SidebarGroupLabel>
          <SidebarGroupContent>{menu(adminItems)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 p-2">
          <Avatar>
            <AvatarFallback>{initials(fullName)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col text-sm">
            <span className="font-semibold">{fullName}</span>
            <span className="text-xs">{roleLabel}</span>
          </div>
          {/* Prototype: like in Profil, signing out just goes back to the login screen. */}
          <Button asChild variant="ghost" size="icon" aria-label={t("signOut")}>
            <Link href="/login">
              <LogOutIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
