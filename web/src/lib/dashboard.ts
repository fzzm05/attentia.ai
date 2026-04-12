import { requireProfile, requireRole } from "@/lib/auth";
import { createAdminDbClient } from "@/lib/db/server";
import type {
  AdminSummary,
  ChildAlert,
  ChildDashboardData,
  ChildOverview,
  ChildProfileRecord,
  ChildProgressReport,
  ChildRecord,
  ChildSession,
  ParentAccountSummary,
  ParentOption,
  SessionRecord,
  StudySessionData,
} from "@/lib/supabase/types";

async function getParentAccountIdForProfile(profileId: string) {
  const db = createAdminDbClient();
  const { data } = await db
    .from("parent_accounts")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  return data?.id ?? null;
}

export async function getAccessibleChildRecord(childId: string): Promise<ChildRecord | null> {
  const profile = await requireProfile();
  const db = createAdminDbClient();
  const { data: child } = await db
    .from("children")
    .select(
      "id, parent_account_id, full_name, preferred_name, date_of_birth, status, notes, baseline_difficulty, baseline_gain_capability, created_at",
    )
    .eq("id", childId)
    .maybeSingle();

  if (child === null) {
    return null;
  }

  if (profile.role === "parent") {
    const parentAccountId = await getParentAccountIdForProfile(profile.id);

    if (parentAccountId === null || child.parent_account_id !== parentAccountId) {
      return null;
    }
  }

  return child as ChildRecord;
}

export async function getAdminSummary(): Promise<AdminSummary> {
  await requireRole("platform_admin");
  const db = createAdminDbClient();

  const [{ count: totalParents }, { count: totalChildren }, { count: totalSessions }, { count: activeSessions }] =
    await Promise.all([
      db.from("parent_accounts").select("*", { count: "exact", head: true }),
      db.from("children").select("*", { count: "exact", head: true }),
      db.from("sessions").select("*", { count: "exact", head: true }),
      db
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("status", "running"),
    ]);

  return {
    totalParents: totalParents ?? 0,
    totalChildren: totalChildren ?? 0,
    totalSessions: totalSessions ?? 0,
    activeSessions: activeSessions ?? 0,
  };
}

export async function getAdminChildrenOverview() {
  await requireRole("platform_admin");
  const db = createAdminDbClient();
  const { data } = await db
    .from("parent_children_overview_view")
    .select("*")
    .order("full_name", { ascending: true });

  return (data ?? []) as ChildOverview[];
}

export async function getAdminParentAccounts(): Promise<ParentAccountSummary[]> {
  await requireRole("platform_admin");
  const db = createAdminDbClient();

  const { data: parentAccounts } = await db
    .from("parent_accounts")
    .select(
      "id, profile_id, onboarding_completed, emergency_contact_name, emergency_contact_phone",
    )
    .order("created_at", { ascending: true });

  if (!parentAccounts || parentAccounts.length === 0) {
    return [];
  }

  const profileIds = parentAccounts.map((account) => account.profile_id);
  const parentAccountIds = parentAccounts.map((account) => account.id);

  const [{ data: profiles }, { data: children }] = await Promise.all([
    db
      .from("profiles")
      .select("id, email, full_name, phone")
      .in("id", profileIds),
    db
      .from("children")
      .select("id, parent_account_id")
      .in("parent_account_id", parentAccountIds),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );
  const childCountMap = new Map<string, number>();

  for (const child of children ?? []) {
    childCountMap.set(
      child.parent_account_id,
      (childCountMap.get(child.parent_account_id) ?? 0) + 1,
    );
  }

  return parentAccounts.map((account) => {
    const profile = profileMap.get(account.profile_id);

    return {
      profile_id: account.profile_id,
      parent_account_id: account.id,
      email: profile?.email ?? null,
      full_name: profile?.full_name ?? "Parent",
      phone: profile?.phone ?? null,
      onboarding_completed: account.onboarding_completed,
      emergency_contact_name: account.emergency_contact_name,
      emergency_contact_phone: account.emergency_contact_phone,
      child_count: childCountMap.get(account.id) ?? 0,
    };
  });
}

export async function getParentOptions(): Promise<ParentOption[]> {
  await requireRole("platform_admin");
  const parentAccounts = await getAdminParentAccounts();

  return parentAccounts.map((parent) => ({
    parent_account_id: parent.parent_account_id,
    profile_id: parent.profile_id,
    full_name: parent.full_name,
    email: parent.email,
  }));
}

export async function getParentChildrenOverview() {
  const profile = await requireRole("parent");
  const db = createAdminDbClient();

  const parentAccountId = await getParentAccountIdForProfile(profile.id);

  if (parentAccountId === null) {
    return [];
  }

  const { data } = await db
    .from("parent_children_overview_view")
    .select("*")
    .eq("parent_account_id", parentAccountId)
    .order("full_name", { ascending: true });

  return (data ?? []) as ChildOverview[];
}

export async function getChildDashboardData(
  childId: string,
): Promise<ChildDashboardData | null> {
  const profile = await requireProfile();
  const db = createAdminDbClient();

  const [
    { data: overview },
    { data: child },
    { data: childProfile },
    { data: sessions },
    { data: alerts },
    { data: latestReport },
  ] = await Promise.all([
    db
      .from("parent_children_overview_view")
      .select("*")
      .eq("child_id", childId)
      .maybeSingle(),
    db
      .from("children")
      .select(
        "id, parent_account_id, full_name, preferred_name, date_of_birth, status, notes, baseline_difficulty, baseline_gain_capability, created_at",
      )
      .eq("id", childId)
      .maybeSingle(),
    db
      .from("child_profiles")
      .select(
        "child_id, sensory_notes, learning_notes, medical_notes, preferred_interventions, avoided_interventions",
      )
      .eq("child_id", childId)
      .maybeSingle(),
    db
      .from("sessions")
      .select(
        "id, status, started_at, ended_at, baseline_calibrated, summary_emotion, summary_distraction, summary_noise_level, summary_action",
      )
      .eq("child_id", childId)
      .order("started_at", { ascending: false })
      .limit(10),
    db
      .from("alerts")
      .select("id, type, title, message, created_at, acknowledged_at")
      .eq("child_id", childId)
      .order("created_at", { ascending: false })
      .limit(6),
    db
      .from("child_progress_reports")
      .select(
        "id, period, period_start, period_end, session_count, avg_distraction, avg_noise_level, dominant_emotion, dominant_action, total_interventions, summary",
      )
      .eq("child_id", childId)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (child === null) {
    return null;
  }

  if (profile.role === "parent") {
    const parentAccountId = await getParentAccountIdForProfile(profile.id);

    if (parentAccountId === null || child.parent_account_id !== parentAccountId) {
      return null;
    }
  }

  return {
    overview: (overview as ChildOverview | null) ?? null,
    child: child as ChildRecord,
    profile: (childProfile as ChildProfileRecord | null) ?? null,
    sessions: (sessions ?? []) as ChildSession[],
    alerts: (alerts ?? []) as ChildAlert[],
    latestReport: (latestReport as ChildProgressReport | null) ?? null,
  };
}

export async function getStudySessionData(
  sessionId: string,
): Promise<StudySessionData | null> {
  const profile = await requireProfile();
  const db = createAdminDbClient();

  const { data: session } = await db
    .from("sessions")
    .select(
      "id, child_id, status, started_at, ended_at, baseline_calibrated, baseline_payload, runtime_metadata, summary_emotion, summary_distraction, summary_noise_level, summary_action, created_at",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (session === null) {
    return null;
  }

  const child = await getAccessibleChildRecord(session.child_id);

  if (child === null) {
    return null;
  }

  return {
    child,
    profile,
    session: session as SessionRecord,
  };
}
