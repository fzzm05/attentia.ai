import Link from "next/link";

import { getAuthenticatedProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await getAuthenticatedProfile();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dff6ef,_transparent_30%),radial-gradient(circle_at_top_right,_#f6ead6,_transparent_30%),linear-gradient(180deg,_#fbfaf7_0%,_#eef4ef_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-teal-700">
              attentia.ai
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-6xl">
              Adaptive learning platform
            </h1>
          </div>
          <nav className="flex items-center gap-3">
            {profile ? (
              <>
                <span className="hidden text-sm text-slate-600 sm:inline">
                  {profile.full_name}
                </span>
                <Link className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white" href={profile.role === "platform_admin" ? "/admin" : "/parent"}>
                  Open dashboard
                </Link>
              </>
            ) : (
              <Link className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white" href="/login">
                Sign in
              </Link>
            )}
          </nav>
        </header>

        <section className="mt-16 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm font-medium text-teal-700">Platform overview</p>
            <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
              One platform for admins, parents, and eventually live child-session insights.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              This web app is the management and reporting layer on top of the local
              sensing and RL session engine. It is designed to use Firebase Auth for
              identity and Supabase Postgres for platform data, with role-based access
              for admins and parents.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <FeatureCard
                title="Admin"
                body="Manage parent accounts, children, active sessions, and platform health."
              />
              <FeatureCard
                title="Parent"
                body="Track child progress, view recent sessions, and understand intervention history."
              />
              <FeatureCard
                title="Realtime-ready"
                body="Structured for live state, event logs, and future mobile support."
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-teal-100 bg-slate-950 p-8 text-slate-50 shadow-[0_20px_80px_rgba(15,23,42,0.16)]">
            <p className="text-sm uppercase tracking-[0.2em] text-teal-300">
              Current build
            </p>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
              <li>Next.js App Router frontend in `web/`</li>
              <li>Firebase email/password auth and role protection</li>
              <li>Admin and parent dashboard skeletons</li>
              <li>Database schema aligned with session, event, and report tables</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900" href="/login">
                Open sign in
              </Link>
              <a
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-slate-100"
                href="https://console.firebase.google.com/"
                rel="noreferrer"
                target="_blank"
              >
                Open Firebase
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}
