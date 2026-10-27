import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware versions of Next's navigation helpers. Use these instead of
// "next/link" / "next/navigation" so links keep the current language,
// e.g. <Link href="/login"> goes to /de/login or /fr/login.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
