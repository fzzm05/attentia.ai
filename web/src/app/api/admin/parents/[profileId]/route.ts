import { NextResponse } from "next/server";

import { getAuthenticatedProfile } from "@/lib/auth";
import { createAdminDbClient } from "@/lib/db/server";
import { hasRequiredEnv } from "@/lib/env";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  if (hasRequiredEnv() === false) {
    return NextResponse.json({ error: "Platform environment is not configured." }, { status: 500 });
  }

  const actor = await getAuthenticatedProfile();

  if (actor?.role !== "platform_admin") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  const { profileId } = await params;
  const body = (await request.json()) as {
    fullName?: string;
    phone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    onboardingCompleted?: boolean;
  };

  const fullName = body.fullName?.trim() ?? "";
  const phone = body.phone?.trim() || null;
  const emergencyContactName = body.emergencyContactName?.trim() || null;
  const emergencyContactPhone = body.emergencyContactPhone?.trim() || null;
  const onboardingCompleted = Boolean(body.onboardingCompleted);

  if (!fullName) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }

  try {
    const db = createAdminDbClient();
    const { data: parentAccount, error: parentLookupError } = await db
      .from("parent_accounts")
      .select("id")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (parentLookupError || !parentAccount) {
      throw new Error("Parent account not found.");
    }

    const { error: profileError } = await db
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
      })
      .eq("id", profileId);

    if (profileError) {
      throw profileError;
    }

    const { error: parentError } = await db
      .from("parent_accounts")
      .update({
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
        onboarding_completed: onboardingCompleted,
      })
      .eq("id", parentAccount.id);

    if (parentError) {
      throw parentError;
    }

    await getFirebaseAdminAuth().updateUser(profileId, {
      displayName: fullName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update parent account.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  if (hasRequiredEnv() === false) {
    return NextResponse.json({ error: "Platform environment is not configured." }, { status: 500 });
  }

  const actor = await getAuthenticatedProfile();

  if (actor?.role !== "platform_admin") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  const { profileId } = await params;

  try {
    const db = createAdminDbClient();
    const { error: deleteError } = await db.from("profiles").delete().eq("id", profileId);

    if (deleteError) {
      throw deleteError;
    }

    await getFirebaseAdminAuth().deleteUser(profileId).catch(() => undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to delete parent account.",
      },
      { status: 400 },
    );
  }
}
