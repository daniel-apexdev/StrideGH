import { z } from "zod";

export const distanceCategories = ["5K", "10K", "Half", "Marathon", "Other"] as const;
export const verificationStates = ["unverified", "verified", "details_tbc"] as const;
export const feeKinds = ["free", "paid", "unconfirmed"] as const;
export const registrationMethods = ["url", "phone", "ussd", "none"] as const;

export const distanceSchema = z.object({
  label: z.string().min(1),
  category: z.enum(distanceCategories),
  /** Price in minor units (pesewas / cents). null = not published. */
  priceMinor: z.number().int().nonnegative().nullable(),
  note: z.string().nullable(),
});

/**
 * The organiser's poster or flyer. `src` is either a path under the website's public folder
 * (e.g. "/posters/gold-coast-run-2026.jpg") or a full https URL (e.g. Supabase Storage).
 * Width and height are the image's real pixel size, so it can be shown uncropped.
 */
export const posterSchema = z.object({
  src: z.string().refine((s) => s.startsWith("/") || s.startsWith("https://"), "Use /posters/... or an https URL"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().min(1),
});

export const raceEventSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  /** Local race date, YYYY-MM-DD (Ghana is on GMT, so no offset needed). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  region: z.string().nullable(),
  city: z.string().nullable(),
  venue: z.string().nullable(),
  organiser: z.string().nullable(),
  feeSummary: z.string().nullable(),
  feeKind: z.enum(feeKinds),
  currency: z.string().length(3),
  registration: z.object({
    method: z.enum(registrationMethods),
    url: z.string().url().nullable(),
    note: z.string().nullable(),
    /** Last day to register, YYYY-MM-DD, if the organiser has said. Used for "closes soon" reminders. */
    closes: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .default(null),
  }),
  highlights: z.array(z.string()),
  walkerFriendly: z.boolean().nullable(),
  verification: z.enum(verificationStates),
  verifiedAt: z.string().nullable(),
  coverColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  poster: posterSchema.nullable().default(null),
  /** More images from the organiser (medal, route, second flyer), shown under the poster. Same rules as `poster`. */
  gallery: z.array(posterSchema).default([]),
  /** The organiser's own description of the race (from a submission). null for races we listed ourselves. */
  description: z.string().nullable().default(null),
  distances: z.array(distanceSchema).min(1),
  /**
   * After race day: links to the official results and photos, and a few photos to show on the
   * race page. Fill in once the organiser publishes them (see data/RACES.md).
   */
  recap: z
    .object({
      resultsUrl: z.string().url().nullable().default(null),
      photosUrl: z.string().url().nullable().default(null),
      photos: z.array(posterSchema).default([]),
      note: z.string().nullable().default(null),
    })
    .nullable()
    .default(null),
});

export type Distance = z.infer<typeof distanceSchema>;
export type Poster = z.infer<typeof posterSchema>;
export type RaceEvent = z.infer<typeof raceEventSchema>;
export type DistanceCategory = (typeof distanceCategories)[number];
export type FeeKind = (typeof feeKinds)[number];

export type EventFilters = {
  q?: string;
  distance?: DistanceCategory;
  when?: "upcoming" | "30days" | "past";
  city?: string;
  fee?: FeeKind;
};
