import type { RaceEvent } from "@/lib/events/types";
import { formatDate, isPast } from "@/lib/events/format";

const styles = {
  verified: { label: "Checked with official page", cls: "bg-ok-bg text-ok-fg" },
  details_tbc: { label: "Details to be confirmed", cls: "bg-warn-bg text-warn-fg" },
  unverified: { label: "Not yet verified", cls: "bg-neu-bg text-neu-fg" },
  past: { label: "Past race", cls: "bg-neu-bg text-neu-fg" },
} as const;

export function VerificationBadge({ event, today, className = "" }: { event: RaceEvent; today: string; className?: string }) {
  const past = isPast(event, today);
  const s = past ? styles.past : styles[event.verification];
  return (
    <span className={`inline-flex self-start rounded-[5px] px-[7px] py-[3px] text-[11px] font-bold ${s.cls} ${className}`}>
      {past ? `Raced on ${formatDate.short(event.date)}` : s.label}
    </span>
  );
}
