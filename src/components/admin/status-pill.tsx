import { statusLabels, type SubmissionStatus } from "@/lib/submissions/schema";

const tone: Record<SubmissionStatus, string> = {
  pending: "bg-warn-bg text-warn-fg",
  changes_requested: "bg-neu-bg text-neu-fg",
  approved: "bg-ok-bg text-ok-fg",
  rejected: "bg-[#f6dcd5] text-[#7d2412] dark:bg-[#3a1a12] dark:text-[#ffb4a1]",
};

export function StatusPill({ status }: { status: SubmissionStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone[status]}`}>{statusLabels[status]}</span>;
}
