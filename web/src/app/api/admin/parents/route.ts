import { NextResponse } from "next/server";

import { getAuthenticatedProfile } from "@/lib/auth";
import { createAdminDbClient } from "@/lib/db/server";
import { hasRequiredEnv } from "@/lib/env";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  if (hasRequiredEnv() === false) {
    return NextResponse.json({ error: "Platform environment is not configured." }, { status: 500 });
  }

  const actor = await getAuthenticatedProfile();

  if (actor?.role !== "platform_admin") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  const body = (await request.json()) as {
    email?: string;
    fullName?: string;
    password?: string;
    phone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };

  const email = body.email?.trim() ?? "";
  const fullName = body.fullName?.trim() ?? "";
  const password = body.password ?? "";
  const phone = body.phone?.trim() || null;
  const emergencyContactName = body.emergencyContactName?.trim() || null;
  const emergencyContactPhone = body.emergencyContactPhone?.trim() || null;

  if (!email || !fullName || !password) {
    return NextResponse.json(
      { error: "Email, full name, and password are required." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 },
    );
  }

  let userId: string | null = null;

  try {
    const adminAuth = getFirebaseAdminAuth();
    const user = await adminAuth.createUser({
      email,
      password,
      displayName: fullName,
      emailVerified: true,
    });
    userId = user.uid;

    await adminAuth.setCustomUserClaims(user.uid, { role: "parent" });

    const db = createAdminDbClient();
    const { error: profileError } = await db.from("profiles").insert({
      id: user.uid,
      email,
      full_name: fullName,
      role: "parent",
      phone,
    });

    if (profileError) {
      throw profileError;
    }

    const { error: parentAccountError } = await db.from("parent_accounts").insert({
      profile_id: user.uid,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
    });

    if (parentAccountError) {
      throw parentAccountError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (userId) {
      await getFirebaseAdminAuth().deleteUser(userId).catch(() => undefined);
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create parent account.",
      },
      { status: 400 },
    );
  }
}
