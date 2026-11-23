"use client";

import { useSearchParams } from "next/navigation";
import { AuthForm, safeNext } from "@/components/account/account-panel";

/** Reads ?next= and ?mode= (create | signin) and shows the right form. */
export function SignInScreen() {
  const params = useSearchParams();
  return <AuthForm next={safeNext(params.get("next"))} initialMode={params.get("mode") === "signin" ? "signin" : "create"} />;
}
