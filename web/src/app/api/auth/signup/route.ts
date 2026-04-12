import { NextResponse } from "next/server";

import { createAdminDbClient } from "@/lib/db/server";
import { hasRequiredEnv } from "@/lib/env";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import type { AppRole } from "@/lib/supabase/types";

const allowedRoles: AppRole[] = ["platform_admin", "parent"];

function isAllowedRole(value: string): value is AppRole {
  return allowedRoles.includes(value as AppRole);
}

export async function POST(request: Request) {
  if (hasRequiredEnv() === false) {
    return NextResponse.json(
      { error: "Firebase and database environment variables are missing." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    email?: string;
    fullName?: string;
    password?: string;
    role?: string;
  };

  const fullName = body.fullName?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  const role = body.role?.trim() ?? "";

  if (!fullName || !email || !password || !role) {
    return NextResponse.json(
      { error: "Full name, email, password, and role are required." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 },
    );
  }

  if (isAllowedRole(role) === false) {
    return NextResponse.json({ error: "Select a valid role." }, { status: 400 });
  }

  let userId: string | null = null;

  try {
    const adminAuth = getFirebaseAdminAuth();
    const user = await adminAuth.createUser({
      displayName: fullName,
      email,
      emailVerified: true,
      password,
    });
    userId = user.uid;

    await adminAuth.setCustomUserClaims(user.uid, { role });

    const db = createAdminDbClient();
    const { error: profileError } = await db.from("profiles").insert({
      id: user.uid,
      email,
      full_name: fullName,
      role,
    });

    if (profileError) {
      throw profileError;
    }

    if (role === "parent") {
      const { error: parentAccountError } = await db.from("parent_accounts").insert({
        profile_id: user.uid,
      });

      if (parentAccountError) {
        throw parentAccountError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (userId) {
      await getFirebaseAdminAuth().deleteUser(userId).catch(() => undefined);
    }

    const message =
      error instanceof Error ? error.message : "Unable to create the account.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
