import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { LastUpdated } from "@/components/last-updated";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getActiveCamp, getDemoContext, getProfile } from "@/lib/data";

// The frame around every screen after logging in, shared by the "(app)" layout
// (Heute, Kalender, Gantt, Profil) and the Einheit layout (details, edit, new).
// - Phone: the screen itself, with the bottom navigation if `bottomNav` is set.
// - Laptop (lg and wider), Lagerleitung only: a sticky sidebar instead of the bottom
//   navigation, and "Zuletzt aktualisiert" in the bottom right corner.
// pb-28 keeps the last content clear of the fixed bottom navigation or action bar.
export async function AppShell({ children, bottomNav }: { children: ReactNode; bottomNav: boolean }) {
  const { now, userId } = getDemoContext();
  const me = getProfile(userId);
  const camp = getActiveCamp();

  if (me?.role === "head_organizer" && camp) {
    const tRoles = await getTranslations("Roles");
    return (
      <SidebarProvider>
        <AppSidebar
          campName={camp.name}
          fullName={me.full_name}
          roleLabel={tRoles(me.role)}
          className="sticky top-0 hidden h-svh lg:flex"
        />
        <div className="min-w-0 flex-1 pb-28 lg:pb-0">{children}</div>
        {bottomNav && <BottomNav className="lg:hidden" />}
        {/* On a laptop, "Zuletzt aktualisiert" stays in the bottom right corner on every screen.
            On the phone, each screen shows its own at the bottom of the page. */}
        <LastUpdated
          camp={camp}
          now={now}
          className="pointer-events-none fixed right-6 bottom-1 z-10 hidden rounded-sm bg-background/90 px-1 lg:block"
        />
      </SidebarProvider>
    );
  }

  return (
    <>
      <div className="pb-28">{children}</div>
      {bottomNav && <BottomNav />}
    </>
  );
}
