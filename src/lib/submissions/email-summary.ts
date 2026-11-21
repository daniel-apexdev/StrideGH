import { dmy } from "../dates";
import { includedLabels, organiserRoleLabels, raceTypeLabels, type SubmissionInput } from "./schema";

const methodLabels = { url: "Website link", ussd: "USSD / short code", phone: "Phone number", not_open: "Not open yet" } as const;

/**
 * A listing written out as a plain-text email. Used on the static (GitHub Pages) site,
 * where there's no server to receive the form, so the organiser emails it instead.
 */
export function submissionEmail(d: SubmissionInput) {
  const yesNo = (v: boolean | null) => (v === null ? "Not sure" : v ? "Yes" : "No");
  const lines = [
    `RACE`,
    `Name: ${d.race.name}`,
    `Type: ${raceTypeLabels[d.race.type]}`,
    `Description: ${d.race.description}`,
    ``,
    `WHEN & WHERE`,
    `Date: ${dmy(d.when.date)}${d.when.startTime ? ` at ${d.when.startTime}` : ""}`,
    `Venue: ${d.when.venue}, ${d.when.city}, ${d.when.region}`,
    ``,
    `DISTANCES`,
    ...d.distances.map((x) => `- ${x.label}: ${x.free ? "Free" : `GHS ${x.fee}`}${x.cutoff ? ` (cut-off ${x.cutoff})` : ""}`),
    ``,
    `Included: ${d.included.map((i) => includedLabels[i]).join(", ") || "—"}${d.includedOther ? `; ${d.includedOther}` : ""}`,
    `Minimum age: ${d.requirements.minAge ?? "—"}`,
    `Walkers welcome: ${yesNo(d.requirements.walkersWelcome)}`,
    ...(d.requirements.notes ? [`Notes: ${d.requirements.notes}`] : []),
    ``,
    `REGISTRATION`,
    `How: ${methodLabels[d.registration.method]}${d.registration.value ? ` — ${d.registration.value}` : ""}`,
    `Closes: ${dmy(d.registration.deadline)}${d.registration.deadlineMayChange ? " (may change)" : ""}`,
    ...(d.posterLink ? [`Poster: ${d.posterLink}`] : []),
    ``,
    `ORGANISER`,
    `${d.organiser.organisation} — ${d.organiser.contactName} (${organiserRoleLabels[d.organiser.role]})`,
    `Email: ${d.organiser.email}`,
    `Phone: ${d.organiser.phone}`,
    ...(d.organiser.social ? [`Social: ${d.organiser.social}`] : []),
    ``,
    `I confirm these details are accurate.`,
  ];
  return { subject: `Race listing: ${d.race.name} (${dmy(d.when.date)})`, body: lines.join("\n") };
}
