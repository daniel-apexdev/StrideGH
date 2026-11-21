import type { DistanceCategory } from "../events/types";
import { countryByIso, formatPhone, parsePhone } from "../contact";
import type { SubmissionInput, includedOptions, organiserRoles, raceTypes, registrationMethods } from "./schema";

/** Ghana's 16 regions, for the region picker. */
export const ghanaRegions = [
  "Greater Accra",
  "Ashanti",
  "Central",
  "Eastern",
  "Western",
  "Western North",
  "Volta",
  "Oti",
  "Northern",
  "Savannah",
  "North East",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
] as const;

/** Form fields as people type them (numbers stay strings until submit). Mirrored in mobile/src/lib/submission.ts. */
export type DistanceDraft = { label: string; category: DistanceCategory; fee: string; free: boolean; capacity: string; cutoff: string };
export type FormDraft = {
  name: string;
  type: (typeof raceTypes)[number] | "";
  description: string;
  date: string;
  startTime: string;
  city: string;
  region: string;
  venue: string;
  distances: DistanceDraft[];
  included: (typeof includedOptions)[number][];
  includedOther: string;
  minAge: string;
  walkersWelcome: "yes" | "no" | "";
  requirementNotes: string;
  regMethod: (typeof registrationMethods)[number];
  regValue: string;
  regDeadline: string;
  regDeadlineMayChange: boolean;
  posterLink: string;
  organisation: string;
  contactName: string;
  role: (typeof organiserRoles)[number] | "";
  email: string;
  /** Country for the phone number (ISO code, e.g. "GH"). */
  phoneCountry: string;
  /** The local number as typed, without the country code. */
  phone: string;
  social: string;
  consent: boolean;
};

export const emptyDistance = (): DistanceDraft => ({ label: "", category: "Other", fee: "", free: false, capacity: "", cutoff: "" });

/** Best guess at the category from what the organiser typed ("21.1 km" → Half). They can still change it. */
export function guessCategory(label: string): DistanceCategory {
  const t = label.toLowerCase().replace(/\s+/g, "");
  if (/half|21(\.1)?k|21(\.1)?km/.test(t)) return "Half";
  if (/marathon|42(\.2)?k|42(\.2)?km/.test(t)) return "Marathon";
  if (/^10(k|km)$/.test(t)) return "10K";
  if (/^5(k|km)$/.test(t)) return "5K";
  return "Other";
}

export const emptyDraft = (): FormDraft => ({
  name: "",
  type: "",
  description: "",
  date: "",
  startTime: "",
  city: "",
  region: "",
  venue: "",
  distances: [emptyDistance()],
  included: [],
  includedOther: "",
  minAge: "",
  walkersWelcome: "",
  requirementNotes: "",
  regMethod: "url",
  regValue: "",
  regDeadline: "",
  regDeadlineMayChange: false,
  posterLink: "",
  organisation: "",
  contactName: "",
  role: "",
  email: "",
  phoneCountry: "GH",
  phone: "",
  social: "",
  consent: false,
});

const num = (s: string) => {
  const t = s.replace(/[,\s]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

/** Draft → the API body. Validation happens with submissionInputSchema afterwards. */
export function draftToInput(d: FormDraft): unknown {
  return {
    race: { name: d.name, type: d.type || undefined, description: d.description },
    when: { date: d.date, startTime: d.startTime || null, city: d.city, region: d.region, venue: d.venue },
    distances: d.distances.map((x) => ({
      label: x.label,
      category: x.category,
      fee: x.free ? 0 : num(x.fee),
      free: x.free,
      capacity: num(x.capacity),
      cutoff: x.cutoff || null,
    })),
    included: d.included,
    includedOther: d.includedOther || null,
    requirements: {
      minAge: num(d.minAge),
      walkersWelcome: d.walkersWelcome === "" ? null : d.walkersWelcome === "yes",
      notes: d.requirementNotes || null,
    },
    registration: { method: d.regMethod, value: d.regMethod === "not_open" ? null : d.regValue || null, deadline: d.regDeadline || null, deadlineMayChange: d.regDeadlineMayChange },
    posterLink: d.posterLink || null,
    organiser: {
      organisation: d.organisation,
      contactName: d.contactName,
      role: d.role || undefined,
      email: d.email,
      phone: d.phone.trim() ? formatPhone(countryByIso(d.phoneCountry), d.phone) : "",
      social: d.social || null,
    },
    consent: d.consent,
  };
}

/** A submitted form back into a draft (to edit and resubmit after changes are requested). */
export function inputToDraft(i: SubmissionInput): FormDraft {
  const s = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
  return {
    name: i.race.name,
    type: i.race.type,
    description: i.race.description,
    date: i.when.date,
    startTime: i.when.startTime ?? "",
    city: i.when.city,
    region: i.when.region,
    venue: i.when.venue,
    distances: i.distances.map((x) => ({
      label: x.label,
      category: x.category,
      fee: x.free ? "" : s(x.fee),
      free: x.free,
      capacity: s(x.capacity),
      cutoff: x.cutoff ?? "",
    })),
    included: i.included,
    includedOther: i.includedOther ?? "",
    minAge: s(i.requirements.minAge),
    walkersWelcome: i.requirements.walkersWelcome === null ? "" : i.requirements.walkersWelcome ? "yes" : "no",
    requirementNotes: i.requirements.notes ?? "",
    regMethod: i.registration.method,
    regValue: i.registration.value ?? "",
    regDeadline: i.registration.deadline ?? "",
    regDeadlineMayChange: i.registration.deadlineMayChange ?? false,
    posterLink: i.posterLink ?? "",
    organisation: i.organiser.organisation,
    contactName: i.organiser.contactName,
    role: i.organiser.role,
    email: i.organiser.email,
    phoneCountry: parsePhone(i.organiser.phone).country.iso,
    phone: parsePhone(i.organiser.phone).number,
    social: i.organiser.social ?? "",
    consent: false,
  };
}

/** Plain-language review promise shown on the app and website. */
export const listingGuide = {
  steps: [
    { title: "Tell us about the race", body: "Date, venue, distances, fees and how runners register. About 5 minutes." },
    { title: "We check it", body: "We compare it with your official page or social account, usually within 2 working days." },
    { title: "It goes live", body: "Approved races appear on the app and website. If something needs fixing, your status shows what to change." },
  ],
  needs: [
    "The race date, start time and start venue",
    "Each distance with its entry fee (or that it's free)",
    "Your registration link, USSD code or phone number",
    "A link to your official page, poster or social post, so we can check details",
  ],
  rules: [
    "Running and walking events in Ghana only: road, trail, fun runs, charity runs and challenges.",
    "Registration must go through the organiser. Stride GH doesn't take entry fees yet.",
    "Details must match your official announcement. We may ask for proof before approving.",
    "If the race is postponed or cancelled, tell us so we can update or hide the listing.",
  ],
};
