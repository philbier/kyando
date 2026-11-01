import { getTranslations } from "next-intl/server";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { LastUpdated } from "@/components/last-updated";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getActiveCamp, getDemoContext, getProfile } from "@/lib/data";

// Layout for the screens you see after logging in (Heute, Kalender, Profil).
// The "(app)" folder is a route group: the parentheses keep it out of the URL,
// so app/[locale]/(app)/heute/page.tsx is served at /de/heute.
// Each page sets its own width (phone screens use max-w-md), so the laptop
// Wochenplan can use the whole screen.
// TODO: once Supabase Auth is connected, redirect to /login here when nobody is logged in.
export default async function AppLayout({ children }: LayoutProps<"/[locale]">) {
  const { now, userId } = getDemoContext();
  const me = getProfile(userId);
  const camp = getActiveCamp();

  // On a laptop (lg and wider), the Lagerleitung gets a sticky sidebar instead
  // of the bottom navigation. Everyone else keeps the phone layout.
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
        {/* pb-28 keeps the last content clear of the fixed bottom navigation. */}
        <div className="min-w-0 flex-1 pb-28 lg:pb-0">{children}</div>
        <BottomNav className="lg:hidden" />
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
      <BottomNav />
    </>
  );
}
