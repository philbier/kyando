import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Joins class names and lets later Tailwind classes override earlier ones,
// e.g. cn("h-9", "h-11") -> "h-11". Used by every shadcn component.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
