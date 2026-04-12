import { NextResponse } from "next/server";

import { getAuthenticatedProfile } from "@/lib/auth";
import { createAdminDbClient } from "@/lib/db/server";
import { getAccessibleChildRecord } from "@/lib/dashboard";
import { hasRequiredEnv } from "@/lib/env";

export async function POST(request: Request) {
  if (hasRequiredEnv() === false) {
    return NextResponse.json(
      { error: "Platform environment is not configured." },
      { status: 500 },
    );
  }

  const profile = await getAuthenticatedProfile();

  if (!profile) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const body = (await request.json()) as {
    childId?: string;
    difficulty?: number;
    gainCapability?: number;
    activityLabel?: string;
  };

  const childId = body.childId?.trim() ?? "";

  if (!childId) {
    return NextResponse.json({ error: "Child is required." }, { status: 400 });
  }

  const child = await getAccessibleChildRecord(childId);

  if (child === null) {
    return NextResponse.json({ error: "Child not found." }, { status: 404 });
  }

  const difficulty = Math.max(0, Math.min(4, Number(body.difficulty ?? child.baseline_difficulty)));
  const gainCapability = Math.max(
    0,
    Math.min(4, Number(body.gainCapability ?? child.baseline_gain_capability)),
  );

  const db = createAdminDbClient();
  const { data: session, error } = await db
    .from("sessions")
    .insert({
      child_id: child.id,
      status: "pending",
      runtime_metadata: {
        frontend_phase: "awaiting_permissions",
        capture_mode: "browser_stream",
        engine_transport: "websocket",
        requested_activity: body.activityLabel?.trim() || "guided_study",
        launch_role: profile.role,
        requested_difficulty: difficulty,
        requested_gain_capability: gainCapability,
      },
    })
    .select("id")
    .single();

  if (error || !session) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to create session." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    sessionId: session.id,
    route: `/study/session/${session.id}`,
  });
}
