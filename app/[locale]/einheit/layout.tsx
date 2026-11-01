// Layout for the session screens (details, edit, new). They sit outside the
// "(app)" group because they have their own top bar and a fixed action bar at
// the bottom instead of the bottom navigation.
// TODO: once Supabase Auth is connected, redirect to /login here when nobody is logged in (like in "(app)").
export default function EinheitLayout({ children }: LayoutProps<"/[locale]/einheit">) {
  // pb-28 keeps the last content clear of the fixed action bar.
  return <div className="mx-auto w-full max-w-md pb-28">{children}</div>;
}
