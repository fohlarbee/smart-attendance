export type ClassValue = string | false | null | undefined;

/** Minimal class joiner — enough for our needs without extra deps. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
