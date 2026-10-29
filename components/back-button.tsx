"use client";

// Client Component: going back in the browser history needs the browser.

import type { ComponentProps, MouseEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";

type BackLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  // Where to go when there is no page to go back to, e.g. when the link was opened directly.
  fallbackHref: string;
};

// Goes back to the previous screen, so Kalender keeps its day and filter.
// It is a real link to `fallbackHref`, so it also works before JavaScript has loaded.
export function BackLink({ fallbackHref, ...props }: BackLinkProps) {
  const router = useRouter();

  function goBack(event: MouseEvent<HTMLAnchorElement>) {
    if (window.history.length > 1) {
      event.preventDefault();
      router.back();
    }
  }

  return <Link href={fallbackHref} onClick={goBack} {...props} />;
}
