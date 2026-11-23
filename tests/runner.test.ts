import { describe, expect, it } from "vitest";
import { alertMatches, daysBetween, reminderDue } from "../scripts/notifications/plan.mjs";
import { alertEmail, reminderEmail } from "../scripts/notifications/emails.mjs";
import { distanceKm, formatFinishTime, pacePerKm, parseFinishTime, publicName, reviewSummary, yearInRunning, type RaceEntry, type Review } from "@/lib/runner/core";
import seed from "../data/events.seed.json";

describe("finish times", () => {
  it("reads the ways people write times", () => {
    expect(parseFinishTime("25:30")).toBe(1530);
    expect(parseFinishTime("1:02:05")).toBe(3725);
    expect(parseFinishTime("1h 2m 5s")).toBe(3725);
    expect(parseFinishTime("58m")).toBe(3480);
    expect(parseFinishTime("25:70")).toBeNull();
    expect(parseFinishTime("fast")).toBeNull();
    expect(parseFinishTime("")).toBeNull();
  });
  it("formats and paces", () => {
    expect(formatFinishTime(3725)).toBe("1:02:05");
    expect(formatFinishTime(1530)).toBe("25:30");
    expect(pacePerKm(1530, 5)).toBe("5:06 /km");
  });
  it("works out kilometres", () => {
    expect(distanceKm({ label: "Half", category: "Half" })).toBe(21.1);
    expect(distanceKm({ label: "12 km run", category: "Other" })).toBe(12);
    expect(distanceKm({ label: "Fun walk", category: "Other" })).toBeNull();
  });
});

describe("year in running", () => {
  const e = (slug: string, date: string, cat: RaceEntry["distance_category"], km: number, secs: number | null, region = "Greater Accra"): RaceEntry => ({
    id: slug, race_slug: slug, race_name: slug, race_date: date, region, distance_label: cat, distance_category: cat, distance_km: km, finish_seconds: secs, note: null,
  });
  const all = [
    e("a", "2026-03-01", "10K", 10, 3400),
    e("b", "2026-06-01", "10K", 10, 3300, "Western"),
    e("c", "2026-09-01", "5K", 5, null),
    e("d", "2026-12-20", "Half", 21.1, 7000), // after "today": not counted yet
    e("z", "2025-05-01", "5K", 5, 1500),
  ];
  it("adds up the year so far", () => {
    const y = yearInRunning(all, 2026, "2026-11-23");
    expect(y.races).toBe(3);
    expect(y.finished).toBe(2);
    expect(y.km).toBe(25);
    expect(y.regions).toEqual(["Greater Accra", "Western"]);
    expect(y.bests).toEqual([{ category: "10K", seconds: 3300, race: "b" }]);
    expect(y.months[2] + y.months[5] + y.months[8]).toBe(3);
  });
});

describe("reviews", () => {
  it("averages and names people politely", () => {
    const r = (overall: number, water: number | null) => ({ overall, water, course: null, organisation: null, medal: null }) as unknown as Review;
    const s = reviewSummary([r(5, 4), r(4, null)]);
    expect(s.overall).toBe(4.5);
    expect(s.aspects.find((a) => a.key === "water")?.value).toBe(4);
    expect(publicName("Ama Serwaa Mensah", "x@y.com")).toBe("Ama M.");
    expect(publicName("", "kofi@example.com")).toBe("kofi");
  });
});

describe("daily reminder emails", () => {
  const race = { slug: "x-2026", name: "X Run", date: "2026-12-10", startTime: "06:00", venue: "Park", city: "Accra", distances: [{ label: "5K", category: "5K" }], registration: { url: "https://x.example/reg", closes: "2026-12-05" } };
  it("sends each reminder once, at the right time", () => {
    expect(daysBetween("2026-12-01", "2026-12-10")).toBe(9);
    expect(reminderDue(race, [], "2026-11-25")).toBeNull();
    expect(reminderDue(race, [], "2026-12-02")).toBe("closing");
    expect(reminderDue(race, ["closing"], "2026-12-03")).toBe("week");
    expect(reminderDue(race, ["closing", "week"], "2026-12-04")).toBeNull();
    expect(reminderDue(race, ["closing", "week"], "2026-12-09")).toBe("eve");
    expect(reminderDue(race, ["eve"], "2026-12-10")).toBeNull();
    expect(reminderDue(race, ["eve"], "2026-12-11")).toBe("after");
    expect(reminderDue(race, ["eve", "after"], "2026-12-12")).toBeNull();
    // Signed up late: the week reminder still comes, then the eve one.
    expect(reminderDue({ ...race, registration: {} }, [], "2026-12-08")).toBe("week");
  });
  it("writes emails with an unsubscribe link and no broken placeholders", () => {
    for (const kind of ["closing", "week", "eve", "after"]) {
      const m = reminderEmail({ kind, race, site: "https://s.example", unsubscribeUrl: "https://s.example/unsubscribe/?t=abc" });
      expect(m.html).toContain("https://s.example/unsubscribe/?t=abc");
      expect(m.text).toContain("unsubscribe");
      expect(m.html).not.toMatch(/undefined|null|\$\{/);
    }
  });
  it("matches new races to alerts", () => {
    const races = seed as unknown as Parameters<typeof alertMatches>[1];
    const today = "2026-11-01";
    const any = alertMatches({ distances: [], cities: [] }, races, new Set(), today);
    expect(any.length).toBeGreaterThan(0);
    const tenKAccra = alertMatches({ distances: ["10K"], cities: ["Accra"] }, races, new Set(), today);
    expect(tenKAccra.every((r: { city: string }) => r.city === "Accra")).toBe(true);
    const none = alertMatches({ distances: [], cities: [] }, races, new Set(any.map((r: { slug: string }) => r.slug)), today);
    expect(none).toEqual([]);
    const m = alertEmail({ races: any.slice(0, 2), site: "https://s.example", unsubscribeUrl: "https://s.example/u", first: true });
    expect(m.html).toContain("https://s.example/u");
  });
});
