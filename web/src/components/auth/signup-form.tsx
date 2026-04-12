"use client";

import Link from "next/link";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getFirebaseAuth } from "@/lib/firebase/client";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError("");
    setPending(true);

    const fullName = String(formData.get("full_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "").trim();

    try {
      const signupResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          fullName,
          password,
          role,
        }),
      });

      const signupResult = (await signupResponse.json()) as { error?: string };

      if (!signupResponse.ok) {
        throw new Error(signupResult.error ?? "Unable to create the account.");
      }

      const firebaseAuth = getFirebaseAuth();
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const idToken = await credential.user.getIdToken();

      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      const sessionResult = (await sessionResponse.json()) as {
        error?: string;
        route?: string;
      };

      if (!sessionResponse.ok) {
        await signOut(firebaseAuth);
        throw new Error(sessionResult.error ?? "Unable to create a session.");
      }

      router.push(sessionResult.route ?? "/");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create the account.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      action={(formData) => {
        void handleSubmit(formData);
      }}
      className="space-y-5"
    >
      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-700"
          htmlFor="full_name"
        >
          Full name
        </label>
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500"
          id="full_name"
          name="full_name"
          placeholder="Aarav's Parent"
          type="text"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500"
          id="email"
          name="email"
          placeholder="parent@attentia.ai"
          type="email"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500"
          id="password"
          name="password"
          type="password"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="role">
          Role
        </label>
        <select
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500"
          defaultValue="parent"
          id="role"
          name="role"
        >
          <option value="parent">Parent</option>
          <option value="platform_admin">Platform admin</option>
        </select>
      </div>
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
        This is a temporary bootstrap flow. The selected role is applied at signup time and
        controls which dashboard the new user can access.
      </p>
      {error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <button
        className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link className="text-teal-700 underline underline-offset-4" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
