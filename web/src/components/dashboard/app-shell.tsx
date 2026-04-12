import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import type { AppRole, Profile } from "@/lib/supabase/types";

const links: Record<AppRole, Array<{ href: string; label: string }>> = {
  platform_admin: [{ href: "/admin", label: "Overview" }],
  parent: [{ href: "/parent", label: "My children" }],
};

export function AppShell({
  children,
  profile,
}: {
  children: ReactNode;
  profile: Profile;
}) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6">
        <header className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-teal-700">
              attentia.ai
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {profile.role === "platform_admin" ? "Admin dashboard" : "Parent dashboard"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {links[profile.role].map((link) => (
              <Link
                key={link.href}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700"
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
            <div className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white">
              {profile.full_name}
            </div>
            <SignOutButton />
          </div>
        </header>
        <div className="mt-6 flex-1">{children}</div>
      </div>
    </div>
  );
}
