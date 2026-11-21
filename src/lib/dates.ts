/** Dates as people in Ghana write them: 19/Dec/2026. Stored as ISO (2026-12-19). Mirrored in mobile/src/lib/dates.ts. */

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export const pad = (n: number) => String(n).padStart(2, "0");

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

export function isoDate(year: number, month1: number, day: number): string {
  return `${year}-${pad(month1)}-${pad(Math.min(day, daysInMonth(year, month1)))}`;
}

export function splitIso(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
  return { y, m: mo, d };
}

/** "2026-12-19" → "19/Dec/2026" */
export function dmy(iso: string): string {
  const p = splitIso(iso);
  return p ? `${pad(p.d)}/${MONTHS[p.m - 1]}/${p.y}` : "";
}

/** "2026-12-19" → "Saturday" */
export function weekday(iso: string): string {
  const p = splitIso(iso);
  return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }) : "";
}
