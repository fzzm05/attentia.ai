import { redirect } from "next/navigation";

import { hasRequiredEnv } from "@/lib/env";
import { createAdminDbClient } from "@/lib/db/server";
import { getAuthenticatedSession } from "@/lib/session";
import type { AppRole, Profile } from "@/lib/supabase/types";

export async function getAuthenticatedProfile(): Promise<Profile | null> {
  if (hasRequiredEnv() === false) {
    return null;
  }

  const session = await getAuthenticatedSession();

  if (session === null) {
    return null;
  }

  const db = createAdminDbClient();
  const { data: profile } = await db
    .from("profiles")
    .select("id, email, full_name, role, avatar_url, phone")
    .eq("id", session.uid)
    .single();

  return (profile as Profile | null) ?? null;
}

export async function requireProfile() {
  if (hasRequiredEnv() === false) {
    redirect("/not-configured");
  }

  const profile = await getAuthenticatedProfile();

  if (profile === null) {
    redirect("/login");
  }

  return profile;
}

export async function requireRole(role: AppRole) {
  const profile = await requireProfile();

  if (profile.role === role) {
    return profile;
  }

  redirect(profile.role === "platform_admin" ? "/admin" : "/parent");
}
