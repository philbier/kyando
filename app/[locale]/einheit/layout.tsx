import { AppShell } from "@/components/app-shell";

// Layout for the session screens (details, edit, new). They sit outside the
// "(app)" group because on the phone they have their own top bar and a fixed
// action bar at the bottom instead of the bottom navigation. On a laptop, the
// Lagerleitung gets the same sidebar as on the other screens.
// Each page sets its own width (max-w-md on the phone).
// TODO: once Supabase Auth is connected, redirect to /login here when nobody is logged in (like in "(app)").
export default function EinheitLayout({ children }: LayoutProps<"/[locale]/einheit">) {
  return <AppShell bottomNav={false}>{children}</AppShell>;
}
