import { AppShell } from "@/components/app-shell";

// Layout for the screens you see after logging in (Heute, Kalender, Gantt, Profil).
// The "(app)" folder is a route group: the parentheses keep it out of the URL,
// so app/[locale]/(app)/heute/page.tsx is served at /de/heute.
// Each page sets its own width (phone screens use max-w-md), so the laptop
// Wochenplan can use the whole screen.
// TODO: once Supabase Auth is connected, redirect to /login here when nobody is logged in.
export default function AppLayout({ children }: LayoutProps<"/[locale]">) {
  return <AppShell bottomNav>{children}</AppShell>;
}
