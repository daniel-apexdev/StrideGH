import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("redirect"); } }));

describe("admin sign-in", () => {
  beforeAll(() => {
    vi.stubEnv("ADMIN_PASSWORD", "correct horse");
    vi.stubEnv("SESSION_SECRET", "x".repeat(40));
  });
  afterAll(() => vi.unstubAllEnvs());

  it("checks the password", async () => {
    const auth = await import("@/lib/admin/auth");
    expect(auth.passwordMatches("correct horse")).toBe(true);
    expect(auth.passwordMatches("correct hors")).toBe(false);
  });

  it("accepts its own session tokens and rejects tampered or expired ones", async () => {
    const auth = await import("@/lib/admin/auth");
    const { token } = auth.newSessionToken();
    expect(auth.sessionValid(token)).toBe(true);
    expect(auth.sessionValid(token.replace("admin.", "admin.9"))).toBe(false);
    expect(auth.sessionValid(token.slice(0, -2) + "xx")).toBe(false);
    expect(auth.sessionValid(auth.newSessionToken(Date.now() - 13 * 3600_000).token)).toBe(false);
  });
});
