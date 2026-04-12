import { NextResponse } from "next/server";

import { getAuthenticatedProfile } from "@/lib/auth";
import { createAdminDbClient } from "@/lib/db/server";
import { getStudySessionData } from "@/lib/dashboard";
import { hasRequiredEnv } from "@/lib/env";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  if (hasRequiredEnv() === false) {
    return NextResponse.json(
      { error: "Platform environment is not configured." },
      { status: 500 },
    );
  }

  const { sessionId } = await params;
  const data = await getStudySessionData(sessionId);

  if (data === null) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
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

  const { sessionId } = await params;
  const body = (await request.json()) as {
    status?: string;
    baselineCalibrated?: boolean;
    baselinePayload?: Record<string, unknown>;
    summaryAction?: string | null;
  };

  const db = createAdminDbClient();
  const { data: existingSession } = await db
    .from("sessions")
    .select("status, started_at")
    .eq("id", sessionId)
    .maybeSingle();
  const updatePayload: Record<string, unknown> = {};

  if (body.status) {
    updatePayload.status = body.status;
    if (body.status === "running" && existingSession?.status !== "stopped") {
      updatePayload.started_at = new Date().toISOString();
      updatePayload.ended_at = null;
    }
    if (body.status === "stopped" || body.status === "completed" || body.status === "failed") {
      updatePayload.ended_at = new Date().toISOString();
    }
  }

  if (typeof body.baselineCalibrated === "boolean") {
    updatePayload.baseline_calibrated = body.baselineCalibrated;
  }

  if (body.baselinePayload) {
    updatePayload.baseline_payload = body.baselinePayload;
  }

  if (Object.prototype.hasOwnProperty.call(body, "summaryAction")) {
    updatePayload.summary_action = body.summaryAction;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ success: true });
  }

  const { error } = await db.from("sessions").update(updatePayload).eq("id", sessionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
