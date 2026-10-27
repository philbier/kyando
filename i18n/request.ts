import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

type Messages = { [key: string]: string | Messages };

// Fills keys missing from `messages` with the German text from `fallback`.
function withFallback(messages: Messages, fallback: Messages): Messages {
  const result: Messages = { ...fallback };
  for (const [key, value] of Object.entries(messages)) {
    const base = fallback[key];
    result[key] =
      typeof value === "object" && typeof base === "object"
        ? withFallback(value, base)
        : value;
  }
  return result;
}

// Runs on the server for every request: picks the locale from the URL and
// loads that language's messages, with German filling any gaps.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const german = (await import("../messages/de.json")).default;
  const messages =
    locale === "de"
      ? german
      : withFallback((await import(`../messages/${locale}.json`)).default, german);

  return {
    locale,
    messages,
    // Times are always shown with a 24-hour clock.
    formats: {
      dateTime: {
        time: { hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
      },
    },
  };
});
