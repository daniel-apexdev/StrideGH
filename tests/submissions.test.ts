import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { draftToInput, emptyDraft, guessCategory, inputToDraft } from "@/lib/submissions/form";
import { fieldErrors, newReference, submissionInputSchema, type Submission, type SubmissionInput } from "@/lib/submissions/schema";
import { slugify, submissionToEvent, suggestSlug } from "@/lib/submissions/to-event";

export const validInput = (): SubmissionInput =>
  submissionInputSchema.parse({
    race: { name: "Labadi Beach 10K", type: "road", description: "A flat, fast coastal 10K along Labadi beach road with music at the finish." },
    when: { date: "2099-03-07", startTime: "06:00", city: "Accra", region: "Greater Accra", venue: "Labadi Beach Hotel" },
    distances: [
      { label: "5K", category: "5K", fee: null, free: true, capacity: null, cutoff: null },
      { label: "10K", category: "10K", fee: 150, free: false, capacity: 500, cutoff: "90 minutes" },
    ],
    included: ["bib", "medal"],
    includedOther: null,
    requirements: { minAge: 12, walkersWelcome: true, notes: null },
    registration: { method: "url", value: "https://example.com/register", deadline: "2099-03-01", deadlineMayChange: true },
    posterLink: null,
    organiser: { organisation: "Labadi Runners", contactName: "Ama Mensah", role: "organiser", email: "Ama@Example.com", phone: "+233 24 000 0000", social: null },
    consent: true,
  });

describe("submission form", () => {
  it("accepts a complete form and lowercases the email", () => {
    expect(validInput().organiser.email).toBe("ama@example.com");
  });

  it("reports friendly field errors for an empty form", () => {
    const r = submissionInputSchema.safeParse(draftToInput(emptyDraft()));
    expect(r.success).toBe(false);
    const f = fieldErrors(r.error!);
    expect(f["race.name"]).toBe("Add the race name");
    expect(f["race.type"]).toBe("Pick the kind of race");
    expect(f["organiser.email"]).toMatch(/^Enter a valid email address/);
    expect(f["consent"]).toBe("Please confirm the details are accurate");
  });

  it("checks registration and dates once the basics are filled in", () => {
    const base = validInput();
    const bad = {
      ...base,
      when: { ...base.when, date: "2000-01-01" },
      registration: { method: "url", value: "example.com", deadline: "2000-01-01", deadlineMayChange: false },
      organiser: { ...base.organiser, phone: "+233 24 000" },
    };
    const f = fieldErrors(submissionInputSchema.safeParse(bad).error!);
    expect(f["when.date"]).toMatch(/today onwards/);
    expect(f["registration.deadline"]).toMatch(/today onwards/);
    expect(f["registration.value"]).toMatch(/https/);
    expect(f["organiser.phone"]).toMatch(/9 digits/);
  });

  it("needs a closing date and 30 characters of description", () => {
    const base = validInput();
    const f = fieldErrors(
      submissionInputSchema.safeParse({ ...base, race: { ...base.race, description: "Too short" }, registration: { ...base.registration, deadline: undefined } }).error!,
    );
    expect(f["race.description"]).toBe("Write at least 30 characters");
    expect(f["registration.deadline"]).toBe("Pick the date registration closes");
  });

  it("round-trips through the editable draft", () => {
    const input = validInput();
    const again = submissionInputSchema.parse({ ...(draftToInput(inputToDraft(input)) as object), consent: true });
    expect(again).toEqual(input);
  });

  it("guesses a distance's category from its name", () => {
    expect(["5K", "10 km", "21.1K", "Half marathon", "42.2 km", "7K"].map(guessCategory)).toEqual(["5K", "10K", "Half", "Half", "Marathon", "Other"]);
  });

  it("makes readable references", () => {
    expect(newReference()).toMatch(/^SGH-[A-HJ-NP-Z2-9]{6}$/);
  });
});

describe("approving a submission", () => {
  const sub = (): Submission => ({
    id: "x",
    reference: "SGH-ABCDEF",
    status: "pending",
    source: "app",
    createdAt: "",
    updatedAt: "",
    data: validInput(),
    reviewerNote: null,
    internalNote: null,
    checklist: {},
    publishedSlug: null,
    history: [],
  });

  it("suggests a unique web address", () => {
    expect(slugify("Kwahu Easter Hike & Run!")).toBe("kwahu-easter-hike-and-run");
    expect(suggestSlug("Labadi Beach 10K", "2099-03-07", ["labadi-beach-10k-2099"])).toBe("labadi-beach-10k-2099-2");
  });

  it("turns the form into a listing without inventing anything", () => {
    const e = submissionToEvent(sub(), { slug: "labadi-beach-10k-2099", verification: "verified", today: "2098-12-01" });
    expect(e.feeKind).toBe("paid");
    expect(e.feeSummary).toBe("Free – GHS 150");
    expect(e.distances[0].priceMinor).toBe(0);
    expect(e.distances[1]).toMatchObject({ priceMinor: 15000, note: "500 places · Cut-off 90 minutes" });
    expect(e.registration).toEqual({
      method: "url",
      url: "https://example.com/register",
      closes: "2099-03-01",
      note: "Registration closes 1 March (the organiser says this may change).",
    });
    expect(e.highlights).toEqual(["Race bib", "Finisher medal", "Minimum age 12"]);
    expect(e.verifiedAt).toBe("2098-12-01");
    expect(e.description).toMatch(/coastal/);
    expect(e.poster).toBeNull();
  });
});

describe("local storage driver", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "stride-"));
    vi.stubEnv("STRIDE_LOCAL_DATA_DIR", dir);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true });
  });

  it("saves, updates and publishes", async () => {
    const store = await import("@/lib/submissions/store");
    const [a, b] = await Promise.all([store.createSubmission(validInput(), "app"), store.createSubmission(validInput(), "web")]);
    expect(a.reference).not.toBe(b.reference);
    expect(await store.listSubmissions()).toHaveLength(2);
    expect((await store.getSubmissionByReference(a.reference.toLowerCase()))?.id).toBe(a.id);

    await store.updateSubmission(a.id, (s) => void (s.status = "approved"));
    expect((await store.getSubmission(a.id))?.status).toBe("approved");

    const event = submissionToEvent(a, { slug: "labadi-beach-10k-2099", verification: "unverified", today: "2098-01-01" });
    await store.publishEvent(event);
    await store.setListingStatus("damba-marathon-2026", "archived");
    const seed = (await import("../data/events.seed.json")).default as unknown[];
    const { raceEventSchema } = await import("@/lib/events/types");
    const listings = store.applyLocalListings(seed.map((e) => raceEventSchema.parse(e)), await store.readLocalListings());
    expect(listings.find((l) => l.event.slug === "labadi-beach-10k-2099")?.origin).toBe("submission");
    expect(listings.find((l) => l.event.slug === "damba-marathon-2026")?.status).toBe("archived");
  });
});
