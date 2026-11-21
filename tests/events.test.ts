import { describe, expect, it } from "vitest";
import seed from "../data/events.seed.json";
import { z } from "zod";
import { raceEventSchema } from "@/lib/events/types";
import { countdown, daysUntil, distanceSummary, formatPrice, isPast } from "@/lib/events/format";
import { filterEvents } from "@/lib/events/repository";

const events = z.array(raceEventSchema).parse(seed);
const TODAY = "2026-11-17";

describe("seed data", () => {
  it("is valid and has unique slugs", () => {
    expect(events.length).toBeGreaterThan(0);
    expect(new Set(events.map((e) => e.slug)).size).toBe(events.length);
  });
});

describe("dates", () => {
  it("counts days in Ghana time", () => {
    expect(daysUntil("2026-11-21", TODAY)).toBe(4);
    expect(countdown("2026-11-18", TODAY)).toBe("Tomorrow");
    expect(countdown("2026-11-14", TODAY)).toBe("Took place");
    expect(isPast({ date: "2026-11-16" }, TODAY)).toBe(true);
    expect(isPast({ date: TODAY }, TODAY)).toBe(false);
  });
});

describe("formatting", () => {
  it("formats prices from minor units", () => {
    expect(formatPrice(12000, "GHS")).toBe("GHS 120");
    expect(formatPrice(0, "GHS")).toBe("Free");
    expect(formatPrice(null, "GHS")).toBeNull();
  });
  it("leaves packages out of the distance summary", () => {
    const wcr = events.find((e) => e.slug === "western-city-run-2026")!;
    expect(distanceSummary(wcr.distances)).toBe("10K · 5K");
  });
});

describe("filters", () => {
  it("hides past races by default and shows them under 'past'", () => {
    const upcoming = filterEvents(events, {}, TODAY);
    expect(upcoming.every((e) => !isPast(e, TODAY))).toBe(true);
    const past = filterEvents(events, { when: "past" }, TODAY);
    expect(past.length + upcoming.length).toBe(events.length);
    expect(past[0].date >= past[past.length - 1].date).toBe(true);
  });
  it("filters by distance, city, fee and search", () => {
    expect(filterEvents(events, { distance: "Marathon" }, TODAY).map((e) => e.slug)).toContain("black-star-marathon-2026");
    expect(filterEvents(events, { city: "Takoradi" }, TODAY).map((e) => e.slug)).toEqual(["western-city-run-2026"]);
    expect(filterEvents(events, { fee: "unconfirmed" }, TODAY).every((e) => e.feeKind === "unconfirmed")).toBe(true);
    expect(filterEvents(events, { q: "western city" }, TODAY)).toHaveLength(1);
  });
});

describe("posters", () => {
  const base = events[0];
  it("accepts a local poster with its real size", () => {
    const e = raceEventSchema.parse({ ...base, poster: { src: "/posters/x.jpg", width: 1080, height: 1350, alt: "Poster" } });
    expect(e.poster?.height).toBe(1350);
  });
  it("defaults to no poster and rejects paths outside /posters or https", () => {
    expect(raceEventSchema.parse({ ...base, poster: undefined }).poster).toBeNull();
    expect(() => raceEventSchema.parse({ ...base, poster: { src: "posters/x.jpg", width: 1, height: 1, alt: "x" } })).toThrow();
  });
});
