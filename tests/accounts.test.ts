import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

describe("email-code accounts", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "stride-acc-"));
    vi.stubEnv("STRIDE_LOCAL_DATA_DIR", dir);
    vi.stubEnv("SESSION_SECRET", "s".repeat(40));
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("GMAIL_USER", "");
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true });
  });

  it("creates, verifies and signs in with a code", async () => {
    const auth = await import("@/lib/accounts/auth");
    const t0 = Date.parse("2026-11-18T10:00:00Z");

    await expect(auth.startCode({ mode: "signin", email: "ama@example.com" }, t0)).rejects.toMatchObject({ code: "no_account" });

    const sent = await auth.startCode({ mode: "signup", name: "Ama Mensah", email: "ama@example.com", phone: "+233 24 123 4567" }, t0);
    expect(sent.devCode).toMatch(/^\d{6}$/);
    await expect(auth.startCode({ mode: "signin", email: "ama@example.com" }, t0 + 5000)).rejects.toMatchObject({ code: "too_soon" });

    const wrong = sent.devCode === "000000" ? "111111" : "000000";
    await expect(auth.verifyCode("ama@example.com", wrong, t0 + 10_000)).rejects.toMatchObject({ code: "wrong_code" });
    const ok = await auth.verifyCode("ama@example.com", sent.devCode!, t0 + 20_000);
    expect(ok.isNew).toBe(true);
    expect(ok.user).toMatchObject({ name: "Ama Mensah", phone: "+233 24 123 4567" });

    const req = (token: string) => new Request("http://x/api/auth/me", { headers: { authorization: `Bearer ${token}` } });
    expect((await auth.userFromRequest(req(ok.token), t0 + 30_000))?.email).toBe("ama@example.com");

    // The code is single-use, and the email can't be used to sign up again.
    await expect(auth.verifyCode("ama@example.com", sent.devCode!, t0 + 30_000)).rejects.toMatchObject({ code: "expired" });
    await expect(
      auth.startCode({ mode: "signup", name: "Someone", email: "ama@example.com", phone: "+233 24 123 4567" }, t0 + 60_000),
    ).rejects.toMatchObject({ code: "account_exists" });

    // Signing in later.
    const again = await auth.startCode({ mode: "signin", email: "ama@example.com" }, t0 + 90_000);
    expect(again.purpose).toBe("signin");
    const second = await auth.verifyCode("ama@example.com", again.devCode!, t0 + 100_000);
    expect(second.isNew).toBe(false);

    await auth.signOut(req(ok.token));
    expect(await auth.userFromRequest(req(ok.token), t0 + 110_000)).toBeNull();
    expect(await auth.userFromRequest(req(second.token), t0 + 110_000)).not.toBeNull();
  });

  it("expires codes and locks after five wrong tries", async () => {
    const auth = await import("@/lib/accounts/auth");
    const t0 = Date.parse("2026-11-18T12:00:00Z");
    const sent = await auth.startCode({ mode: "signup", name: "Kofi", email: "kofi@example.com", phone: "+233 20 123 4567" }, t0);
    await expect(auth.verifyCode("kofi@example.com", sent.devCode!, t0 + 11 * 60_000)).rejects.toMatchObject({ code: "expired" });

    const t1 = t0 + 12 * 60_000;
    const next = await auth.startCode({ mode: "signup", name: "Kofi", email: "kofi@example.com", phone: "+233 20 123 4567" }, t1);
    const wrong = next.devCode === "000000" ? "111111" : "000000";
    for (let i = 0; i < 4; i++) await expect(auth.verifyCode("kofi@example.com", wrong, t1 + 1000)).rejects.toMatchObject({ code: "wrong_code" });
    await expect(auth.verifyCode("kofi@example.com", wrong, t1 + 1000)).rejects.toMatchObject({ code: "locked" });
    await expect(auth.verifyCode("kofi@example.com", next.devCode!, t1 + 2000)).rejects.toMatchObject({ code: "locked" });
  });
});
