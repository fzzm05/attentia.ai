import { NextResponse } from "next/server";

import { createAdminDbClient } from "@/lib/db/server";
import { hasRequiredEnv } from "@/lib/env";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { clearSessionCookie, createSessionCookie } from "@/lib/session";
import type { Profile } from "@/lib/supabase/types";

export async function POST(request: Request) {
  if (hasRequiredEnv() === false) {
    return NextResponse.json(
      { error: "Firebase and database environment variables are missing." },
      { status: 500 },
    );
  }

  const { idToken } = (await request.json()) as { idToken?: string };

  if (!idToken) {
    return NextResponse.json({ error: "Missing Firebase ID token." }, { status: 400 });
  }

  await createSessionCookie(idToken);
  const decodedToken = await getFirebaseAdminAuth().verifyIdToken(idToken);
  const db = createAdminDbClient();
  const { data: profile } = await db
    .from("profiles")
    .select("id, email, full_name, role, avatar_url, phone")
    .eq("id", decodedToken.uid)
    .maybeSingle();

  if (profile === null) {
    await clearSessionCookie();
    return NextResponse.json(
      { error: "No platform profile exists for this Firebase account." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    role: (profile as Profile).role,
    route: profile.role === "platform_admin" ? "/admin" : "/parent",
  });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
