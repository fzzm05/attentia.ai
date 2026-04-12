"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getFirebaseAuth } from "@/lib/firebase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);

    try {
      await fetch("/api/auth/session", {
        method: "DELETE",
      });
      await signOut(getFirebaseAuth());
      router.push("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
      disabled={pending}
      onClick={() => {
        void handleSignOut();
      }}
      type="button"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
