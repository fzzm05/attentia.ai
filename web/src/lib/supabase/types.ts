export type AppRole = "platform_admin" | "parent";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  role: AppRole;
  avatar_url: string | null;
  phone: string | null;
};

export type ParentAccountSummary = {
  profile_id: string;
  parent_account_id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  onboarding_completed: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  child_count: number;
};

export type ChildOverview = {
  child_id: string;
  parent_account_id: string;
  full_name: string;
  preferred_name: string | null;
  status: string;
  latest_session_id: string | null;
  latest_session_status: string | null;
  latest_session_started_at: string | null;
  summary_emotion: string | null;
  summary_distraction: number | null;
  summary_noise_level: number | null;
  summary_action: string | null;
  live_recorded_at: string | null;
  live_emotion: string | null;
  live_distraction: number | null;
  live_noise_level: number | null;
  live_action: string | null;
};

export type ChildRecord = {
  id: string;
  parent_account_id: string;
  full_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  status: string;
  notes: string | null;
  baseline_difficulty: number;
  baseline_gain_capability: number;
  created_at: string;
};

export type ChildProfileRecord = {
  child_id: string;
  sensory_notes: string | null;
  learning_notes: string | null;
  medical_notes: string | null;
  preferred_interventions: string[];
  avoided_interventions: string[];
};

export type ChildSession = {
  id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  baseline_calibrated: boolean;
  summary_emotion: string | null;
  summary_distraction: number | null;
  summary_noise_level: number | null;
  summary_action: string | null;
};

export type ChildAlert = {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  acknowledged_at: string | null;
};

export type ChildProgressReport = {
  id: string;
  period: string;
  period_start: string;
  period_end: string;
  session_count: number;
  avg_distraction: number | null;
  avg_noise_level: number | null;
  dominant_emotion: string | null;
  dominant_action: string | null;
  total_interventions: number;
  summary: string | null;
};

export type ChildDashboardData = {
  overview: ChildOverview | null;
  child: ChildRecord;
  profile: ChildProfileRecord | null;
  sessions: ChildSession[];
  alerts: ChildAlert[];
  latestReport: ChildProgressReport | null;
};

export type ParentOption = {
  parent_account_id: string;
  profile_id: string;
  full_name: string;
  email: string | null;
};

export type SessionRecord = {
  id: string;
  child_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  baseline_calibrated: boolean;
  baseline_payload: Record<string, unknown>;
  runtime_metadata: Record<string, unknown>;
  summary_emotion: string | null;
  summary_distraction: number | null;
  summary_noise_level: number | null;
  summary_action: string | null;
  created_at: string;
};

export type StudySessionData = {
  child: ChildRecord;
  profile: Profile;
  session: SessionRecord;
};

export type AdminSummary = {
  totalParents: number;
  totalChildren: number;
  totalSessions: number;
  activeSessions: number;
};
