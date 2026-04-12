import { NextResponse } from "next/server";

import { getAuthenticatedProfile } from "@/lib/auth";
import { createAdminDbClient } from "@/lib/db/server";
import { hasRequiredEnv } from "@/lib/env";

async function getParentAccountIdForProfile(profileId: string) {
  const db = createAdminDbClient();
  const { data } = await db
    .from("parent_accounts")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  return data?.id ?? null;
}

async function ensureChildAccess(childId: string, profileId: string, role: string) {
  const db = createAdminDbClient();
  const { data: child } = await db
    .from("children")
    .select("id, parent_account_id")
    .eq("id", childId)
    .maybeSingle();

  if (!child) {
    return null;
  }

  if (role === "platform_admin") {
    return child;
  }

  const parentAccountId = await getParentAccountIdForProfile(profileId);

  if (!parentAccountId || parentAccountId !== child.parent_account_id) {
    return null;
  }

  return child;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ childId: string }> },
) {
  if (hasRequiredEnv() === false) {
    return NextResponse.json({ error: "Platform environment is not configured." }, { status: 500 });
  }

  const actor = await getAuthenticatedProfile();

  if (!actor) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const { childId } = await params;
  const accessibleChild = await ensureChildAccess(childId, actor.id, actor.role);

  if (!accessibleChild) {
    return NextResponse.json({ error: "Child not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    parentAccountId?: string;
    fullName?: string;
    preferredName?: string;
    dateOfBirth?: string;
    status?: string;
    notes?: string;
    baselineDifficulty?: number;
    baselineGainCapability?: number;
    sensoryNotes?: string;
    learningNotes?: string;
    medicalNotes?: string;
    preferredInterventions?: string;
    avoidedInterventions?: string;
  };

  const preferredInterventions = String(body.preferredInterventions ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const avoidedInterventions = String(body.avoidedInterventions ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const db = createAdminDbClient();
  const childUpdate = {
    full_name: body.fullName?.trim() ?? "",
    preferred_name: body.preferredName?.trim() || null,
    date_of_birth: body.dateOfBirth?.trim() || null,
    status: body.status?.trim() || "active",
    notes: body.notes?.trim() || null,
    baseline_difficulty: body.baselineDifficulty ?? 2,
    baseline_gain_capability: body.baselineGainCapability ?? 2,
    ...(actor.role === "platform_admin" && body.parentAccountId
      ? { parent_account_id: body.parentAccountId.trim() }
      : {}),
  };

  if (!childUpdate.full_name) {
    return NextResponse.json({ error: "Child full name is required." }, { status: 400 });
  }

  try {
    const { error: childError } = await db
      .from("children")
      .update(childUpdate)
      .eq("id", childId);

    if (childError) {
      throw childError;
    }

    const { error: profileError } = await db
      .from("child_profiles")
      .upsert({
        child_id: childId,
        sensory_notes: body.sensoryNotes?.trim() || null,
        learning_notes: body.learningNotes?.trim() || null,
        medical_notes: body.medicalNotes?.trim() || null,
        preferred_interventions: preferredInterventions,
        avoided_interventions: avoidedInterventions,
      });

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update child." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> },
) {
  if (hasRequiredEnv() === false) {
    return NextResponse.json({ error: "Platform environment is not configured." }, { status: 500 });
  }

  const actor = await getAuthenticatedProfile();

  if (actor?.role !== "platform_admin") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  const { childId } = await params;

  try {
    const db = createAdminDbClient();
    const { error } = await db.from("children").delete().eq("id", childId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete child." },
      { status: 400 },
    );
  }
}
