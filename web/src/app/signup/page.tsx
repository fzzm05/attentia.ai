import Link from "next/link";

import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-50">
      <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.24em] text-teal-300">
            attentia.ai
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Create a platform account
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
            Use this Firebase-backed bootstrap flow to create either a parent or
            platform-admin account. The selected role is stored in the platform database
            when the account is created.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <InfoCard
              title="Parent account"
              body="Access the parent dashboard, child progress views, sessions, alerts, and reports."
            />
            <InfoCard
              title="Platform admin"
              body="Access the admin dashboard and platform-level visibility across parents and children."
            />
          </div>
          <Link className="mt-8 inline-flex text-sm text-teal-300 underline underline-offset-4" href="/">
            Back to home
          </Link>
        </section>

        <section className="rounded-[2rem] bg-white p-8 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
          <h2 className="text-2xl font-semibold tracking-tight">Sign up</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This route is intended for local setup and early platform bootstrapping.
          </p>
          <div className="mt-8">
            <SignupForm />
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}
