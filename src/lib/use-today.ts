"use client";

import { useSyncExternalStore } from "react";
import { todayISO } from "./events/format";

const noop = () => () => {};

/**
 * Today's date from the visitor's clock, so "upcoming" and countdowns stay right even when the site was
 * built days ago (as on GitHub Pages). Falls back to the date the page was built while it first loads.
 */
export function useToday(builtOn: string): string {
  return useSyncExternalStore(noop, () => todayISO(), () => builtOn);
}
