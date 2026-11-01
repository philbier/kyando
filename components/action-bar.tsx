import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// The bar fixed to the bottom of the screen that holds the screen's main button,
// e.g. "Einheit bearbeiten". The content scrolls behind it.
export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <div className="mx-auto max-w-md px-4 pt-3">{children}</div>
    </div>
  );
}
