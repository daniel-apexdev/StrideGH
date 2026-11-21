import { z } from "zod";
import { E164, EMAIL, parsePhone, phoneProblem } from "../contact";
import { distanceCategories } from "../events/types";

/**
 * What an organiser sends when they list a race (from the app or the website).
 * Field choices follow what runners need to decide (date, place, distances, fees, what's included,
 * who can take part) and what we need to check it (official registration, organiser contact).
 */

/** The description needs at least this many characters; after that, write as much as you like. */
export const DESCRIPTION_MIN = 30;
export const DESCRIPTION_MAX = 5000;

export const raceTypes = ["road", "trail", "fun_run", "charity", "walk", "challenge"] as const;
export const raceTypeLabels: Record<(typeof raceTypes)[number], string> = {
  road: "Road race",
  trail: "Trail run",
  fun_run: "Fun run",
  charity: "Charity run",
  walk: "Walk",
  challenge: "Challenge / ultra",
};

export const includedOptions = ["bib", "kit", "medal", "refreshment", "timing", "photos"] as const;
export const includedLabels: Record<(typeof includedOptions)[number], string> = {
  bib: "Race bib",
  kit: "Race kit or vest",
  medal: "Finisher medal",
  refreshment: "Water and refreshments",
  timing: "Chip timing",
  photos: "Race photos",
};

export const registrationMethods = ["url", "ussd", "phone", "not_open"] as const;
export const organiserRoles = ["organiser", "team", "runner"] as const;
export const organiserRoleLabels: Record<(typeof organiserRoles)[number], string> = {
  organiser: "I'm the organiser",
  team: "I'm on the organising team",
  runner: "I'm a runner sharing this race",
};

const trimmed = (min: number, max: number, msg: string) => z.string().trim().min(min, msg).max(max, `Keep it under ${max} characters`);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const submissionDistanceSchema = z.object({
  label: trimmed(1, 40, "Name the distance, e.g. 10K"),
  category: z.enum(distanceCategories),
  /** Entry fee in Ghana cedis. null + free=false means "not decided yet". */
  fee: z.number({ error: "Enter the fee as a number, e.g. 150" }).nonnegative("Fees can't be negative").max(100000).nullable(),
  free: z.boolean(),
  capacity: z.number({ error: "Enter a whole number" }).int("Enter a whole number").positive("Enter a whole number").max(100000).nullable().optional().transform((v) => v ?? null),
  cutoff: optionalText(40),
})
  // A free distance always has a GHS 0 fee.
  .transform((d) => (d.free ? { ...d, fee: 0 } : d));

export const submissionInputSchema = z
  .object({
    race: z.object({
      name: trimmed(3, 80, "Add the race name"),
      type: z.enum(raceTypes, { error: "Pick the kind of race" }),
      description: z
        .string()
        .trim()
        .min(DESCRIPTION_MIN, `Write at least ${DESCRIPTION_MIN} characters`)
        .max(DESCRIPTION_MAX, `Keep it under ${DESCRIPTION_MAX.toLocaleString("en-GB")} characters`),
    }),
    when: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the race date"),
      startTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/, "Use HH:MM, e.g. 06:00")
        .nullable()
        .optional()
        .transform((v) => v ?? null),
      city: trimmed(2, 60, "Add the town or city"),
      region: trimmed(2, 40, "Pick the region"),
      venue: trimmed(3, 120, "Add the start venue or meeting point"),
    }),
    distances: z.array(submissionDistanceSchema).min(1, "Add at least one distance").max(10),
    included: z.array(z.enum(includedOptions)).max(includedOptions.length),
    includedOther: optionalText(200),
    requirements: z.object({
      minAge: z.number({ error: "Enter an age, e.g. 12" }).int("Enter an age, e.g. 12").min(1, "Enter an age, e.g. 12").max(100, "Enter an age, e.g. 12").nullable().optional().transform((v) => v ?? null),
      walkersWelcome: z.boolean().nullable(),
      notes: optionalText(300),
    }),
    registration: z.object({
      method: z.enum(registrationMethods),
      value: optionalText(300),
      deadline: z.string({ error: "Pick the date registration closes" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date registration closes"),
      /** The organiser expects the closing date might move. */
      deadlineMayChange: z.boolean().default(false),
    }),
    posterLink: optionalText(500),
    organiser: z.object({
      organisation: trimmed(2, 80, "Add the organiser's name"),
      contactName: trimmed(2, 80, "Add your name"),
      role: z.enum(organiserRoles, { error: "Tell us how you're connected to the race" }),
      email: z.string().trim().toLowerCase().regex(EMAIL, "Enter a valid email address, e.g. ama@gmail.com").max(120),
      phone: z.string().trim().regex(E164, "Choose the country code and enter the number"),
      social: optionalText(120),
    }),
    consent: z.literal(true, { error: "Please confirm the details are accurate" }),
  })
  .superRefine((v, ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    if (v.when.date < today) ctx.addIssue({ code: "custom", path: ["when", "date"], message: "Pick a date from today onwards" });
    if (v.registration.deadline < today) {
      ctx.addIssue({ code: "custom", path: ["registration", "deadline"], message: "Pick a date from today onwards" });
    }
    const phone = parsePhone(v.organiser.phone);
    const phoneIssue = phoneProblem(phone.country, phone.number);
    if (phoneIssue) ctx.addIssue({ code: "custom", path: ["organiser", "phone"], message: phoneIssue });
    if (v.registration.method !== "not_open" && !v.registration.value) {
      ctx.addIssue({
        code: "custom",
        path: ["registration", "value"],
        message: v.registration.method === "url" ? "Add the registration link" : "Add the code or number runners use",
      });
    }
    if (v.registration.method === "url" && v.registration.value && !/^https?:\/\/\S+\.\S+/.test(v.registration.value)) {
      ctx.addIssue({ code: "custom", path: ["registration", "value"], message: "Use a full link starting with https://" });
    }
    if (v.registration.deadline > v.when.date) {
      ctx.addIssue({ code: "custom", path: ["registration", "deadline"], message: "The deadline should be on or before race day" });
    }
    v.distances.forEach((d, i) => {
      if (!d.free && d.fee === 0) ctx.addIssue({ code: "custom", path: ["distances", i, "fee"], message: "Tick “Free” for a GHS 0 entry" });
    });
  });

export type SubmissionInput = z.infer<typeof submissionInputSchema>;
export type SubmissionDistance = z.infer<typeof submissionDistanceSchema>;

export const submissionStatuses = ["pending", "changes_requested", "approved", "rejected"] as const;
export type SubmissionStatus = (typeof submissionStatuses)[number];

export const statusLabels: Record<SubmissionStatus, string> = {
  pending: "In review",
  changes_requested: "Changes requested",
  approved: "Approved & live",
  rejected: "Not approved",
};

/** Reviewer's checklist before approving. */
export const checklistItems = {
  official: "Found the race on the organiser's own page or social account",
  dateVenue: "Date, start time and venue match the official source",
  registration: "Registration link or code works and belongs to the organiser",
  fees: "Distances and fees match the official source",
  poster: "Poster (if any) is the organiser's and can be used",
} as const;
export type ChecklistKey = keyof typeof checklistItems;
export type Checklist = Partial<Record<ChecklistKey, boolean>>;

export type HistoryEntry = { at: string; action: "submitted" | "approved" | "changes_requested" | "rejected" | "note"; note: string | null };

export type Submission = {
  id: string;
  reference: string;
  status: SubmissionStatus;
  source: "app" | "web";
  createdAt: string;
  updatedAt: string;
  data: SubmissionInput;
  /** Shown to the organiser when they check their status. */
  reviewerNote: string | null;
  /** Admin-only notes. */
  internalNote: string | null;
  checklist: Checklist;
  publishedSlug: string | null;
  history: HistoryEntry[];
};

/** Short, unambiguous reference organisers can read out over the phone (no 0/O/1/I). */
export function newReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "SGH-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Field errors keyed "race.name", "distances.0.fee"… for forms on the app and website. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
