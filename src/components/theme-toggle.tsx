"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Icon } from "./icon";

const subscribe = () => () => {};

/** Sun/moon button. Renders a neutral placeholder until mounted to avoid a hydration mismatch. */
export function ThemeToggle({ className = "", tone = "hero" }: { className?: string; tone?: "hero" | "plain" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex h-10 w-10 items-center justify-center rounded-full border ${
        tone === "hero" ? "border-hero-line text-on-hero" : "border-line text-text hover:bg-tile"
      } ${className}`}
    >
      {mounted ? <Icon name={isDark ? "sun" : "moon"} size={18} /> : <span className="h-[18px] w-[18px]" />}
    </button>
  );
}

/** Three-way System / Light / Dark control for the Account page. */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const options = [
    ["system", "System"],
    ["light", "Light"],
    ["dark", "Dark"],
  ] as const;

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 rounded-xl bg-tile p-1">
      {options.map(([value, label]) => {
        const on = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setTheme(value)}
            className={`h-11 rounded-[9px] text-sm font-bold ${on ? "bg-surface" : ""}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
