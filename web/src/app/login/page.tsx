import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-50">
      <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.24em] text-teal-300">
            attentia.ai
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Platform access for admins and parents
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
            This sign-in surface is wired for Firebase Auth and role-based routing.
            Platform admins land in the operational dashboard, and parents land in
            the child progress area.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <InfoCard
              title="Admin area"
              body="Manage families, monitor platform usage, and review child-level activity."
            />
            <InfoCard
              title="Parent area"
              body="Track progress, review session summaries, and understand interventions."
            />
          </div>
          <Link className="mt-8 inline-flex text-sm text-teal-300 underline underline-offset-4" href="/">
            Back to home
          </Link>
        </section>

        <section className="rounded-[2rem] bg-white p-8 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sign in with Firebase email/password. The app will open the dashboard that
            matches your stored role.
          </p>
          <div className="mt-8">
            <LoginForm />
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
