import { NextResponse } from "next/server";

import { getAuthenticatedProfile } from "@/lib/auth";
import { createAdminDbClient } from "@/lib/db/server";
import { hasRequiredEnv } from "@/lib/env";

async function resolveParentAccountId(profileId: string) {
  const db = createAdminDbClient();
  const { data } = await db
    .from("parent_accounts")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  return data?.id ?? null;
}

export async function POST(request: Request) {
  if (hasRequiredEnv() === false) {
    return NextResponse.json({ error: "Platform environment is not configured." }, { status: 500 });
  }

  const actor = await getAuthenticatedProfile();

  if (!actor) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
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

  const fullName = body.fullName?.trim() ?? "";

  if (!fullName) {
    return NextResponse.json({ error: "Child full name is required." }, { status: 400 });
  }

  const db = createAdminDbClient();
  let parentAccountId = body.parentAccountId?.trim() ?? "";

  if (actor.role === "parent") {
    const ownParentAccountId = await resolveParentAccountId(actor.id);

    if (!ownParentAccountId) {
      return NextResponse.json({ error: "Parent account not found." }, { status: 400 });
    }

    parentAccountId = ownParentAccountId;
  }

  if (!parentAccountId) {
    return NextResponse.json({ error: "Select a parent account." }, { status: 400 });
  }

  const preferredInterventions = String(body.preferredInterventions ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const avoidedInterventions = String(body.avoidedInterventions ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  try {
    const { data: child, error: childError } = await db
      .from("children")
      .insert({
        parent_account_id: parentAccountId,
        full_name: fullName,
        preferred_name: body.preferredName?.trim() || null,
        date_of_birth: body.dateOfBirth?.trim() || null,
        status: body.status?.trim() || "active",
        notes: body.notes?.trim() || null,
        baseline_difficulty: body.baselineDifficulty ?? 2,
        baseline_gain_capability: body.baselineGainCapability ?? 2,
      })
      .select("id")
      .single();

    if (childError || !child) {
      throw childError ?? new Error("Unable to create child.");
    }

    const { error: profileError } = await db.from("child_profiles").insert({
      child_id: child.id,
      sensory_notes: body.sensoryNotes?.trim() || null,
      learning_notes: body.learningNotes?.trim() || null,
      medical_notes: body.medicalNotes?.trim() || null,
      preferred_interventions: preferredInterventions,
      avoided_interventions: avoidedInterventions,
    });

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json({ success: true, childId: child.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create child." },
      { status: 400 },
    );
  }
}
