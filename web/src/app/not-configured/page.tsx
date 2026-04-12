import Link from "next/link";

export default function NotConfiguredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-teal-300">Setup required</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Platform environment variables are missing
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Fill in `web/.env.local` with your Firebase client config, Firebase admin
          credentials, and Supabase database service-role credentials, then restart the
          development server.
        </p>
        <Link className="mt-6 inline-flex rounded-full bg-white px-4 py-2 text-sm text-slate-950" href="/">
          Back home
        </Link>
      </div>
    </main>
  );
}
