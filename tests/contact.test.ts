import { describe, expect, it } from "vitest";
import { countryByIso, emailProblem, emailSuggestion, formatPhone, parsePhone, phoneProblem } from "@/lib/contact";
import { daysInMonth, dmy, isoDate } from "@/lib/dates";

describe("phone numbers", () => {
  const gh = countryByIso("GH");
  it("accepts Ghana numbers typed with or without the 0", () => {
    expect(phoneProblem(gh, "024 123 4567")).toBeNull();
    expect(phoneProblem(gh, "24 123 4567")).toBeNull();
    expect(formatPhone(gh, "0241234567")).toBe("+233 24 123 4567");
  });
  it("explains a wrong length", () => {
    expect(phoneProblem(gh, "24 123")).toMatch(/9 digits after \+233/);
    expect(phoneProblem(countryByIso("NG"), "803 123 4567")).toBeNull();
  });
  it("splits a stored number back into country and number", () => {
    expect(parsePhone("+234 803 123 4567")).toMatchObject({ country: { iso: "NG" }, number: "803 123 4567" });
  });
});

describe("email", () => {
  it("checks the shape and suggests fixes for common typos", () => {
    expect(emailProblem("ama")).toMatch(/needs an @/);
    expect(emailProblem("ama@gmail")).toMatch(/Check the email/);
    expect(emailProblem("ama@gmail.com")).toBeNull();
    expect(emailSuggestion("ama@gmial.com")).toBe("ama@gmail.com");
    expect(emailSuggestion("ama@gmail.com")).toBeNull();
  });
});

describe("dates", () => {
  it("shows dates as dd/Mon/yyyy and handles month lengths", () => {
    expect(dmy("2026-12-19")).toBe("19/Dec/2026");
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(isoDate(2027, 2, 31)).toBe("2027-02-28");
  });
});
