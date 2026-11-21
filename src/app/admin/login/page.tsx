import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminConfigured, isAdmin } from "@/lib/admin/auth";
import { login } from "../actions";

export const metadata: Metadata = { title: "Sign in" };

const errors: Record<string, string> = {
  wrong: "That password isn't right.",
  wait: "Too many attempts. Wait a few minutes and try again.",
};

export default async function AdminLogin({ searchParams }: PageProps<"/admin/login">) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  const message = typeof error === "string" ? errors[error] : undefined;
  const ready = adminConfigured();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-forest px-5">
      <div className="w-full max-w-sm rounded-[18px] bg-surface p-6 shadow-xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-volt font-display text-3xl font-extrabold text-night">S</span>
        <h1 className="mt-4 font-display text-3xl font-extrabold uppercase leading-none">Stride GH admin</h1>
        <p className="mt-2 text-sm text-text2">Review race submissions and manage live listings.</p>

        {ready ? (
          <form action={login} className="mt-6 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Admin password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                autoFocus
                className="h-12 rounded-xl border border-line bg-bg px-3.5 text-base font-normal"
              />
            </label>
            {message && (
              <p role="alert" className="text-sm font-semibold text-danger">
                {message}
              </p>
            )}
            <button className="h-12 rounded-xl bg-primary text-sm font-bold text-on-primary">Sign in</button>
          </form>
        ) : (
          <div className="mt-6 rounded-xl bg-warn-bg p-4 text-sm leading-relaxed text-warn-fg">
            <p className="font-bold">Admin sign-in isn&apos;t set up yet.</p>
            <p className="mt-1">
              Add <code>ADMIN_PASSWORD</code> and a random <code>SESSION_SECRET</code> (at least 32 characters) to{" "}
              <code>.env.local</code>, then restart the site. See <code>.env.example</code>.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
