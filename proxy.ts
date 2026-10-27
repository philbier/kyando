import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Runs before every page request (Next.js "proxy", formerly "middleware").
// next-intl adds the language to the URL ("/" -> "/de") and remembers the
// chosen language in a cookie.
export default createIntlMiddleware(routing);

export const config = {
  // Everything except Next.js internals and files with an extension (images, favicon …).
  matcher: "/((?!api|_next|_vercel|.*\..*).*)",
};
