import { BottomNav } from "@/components/bottom-nav";

// Layout for the screens you see after logging in (Heute, Kalender, Profil).
// The "(app)" folder is a route group: the parentheses keep it out of the URL,
// so app/[locale]/(app)/heute/page.tsx is served at /de/heute.
// TODO: once Supabase Auth is connected, redirect to /login here when nobody is logged in.
export default function AppLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <>
      {/* pb-28 keeps the last content clear of the fixed bottom navigation. */}
      <div className="mx-auto w-full max-w-md pb-28">{children}</div>
      <BottomNav />
    </>
  );
}
