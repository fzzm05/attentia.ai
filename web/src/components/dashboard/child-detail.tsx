import Link from "next/link";
import type { ReactNode } from "react";

import { ChildManagement } from "@/components/dashboard/child-management";
import { SessionLauncher } from "@/components/study/session-launcher";
import type { ChildDashboardData, ParentOption, Profile } from "@/lib/supabase/types";

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "None listed";
}

export function ChildDetail({
  backHref,
  backLabel,
  data,
  profile,
  parentOptions,
}: {
  backHref: string;
  backLabel: string;
  data: ChildDashboardData;
  profile: Profile;
  parentOptions: ParentOption[];
}) {
  const displayName = data.child.preferred_name || data.child.full_name;

  return (
    <main className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          className="text-sm font-medium text-teal-700 underline underline-offset-4"
          href={backHref}
        >
          {backLabel}
        </Link>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-500">
              Child profile
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {displayName}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Baseline difficulty {data.child.baseline_difficulty}, gain capability{" "}
              {data.child.baseline_gain_capability}, status {data.child.status}.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              label="Latest session"
              value={data.overview?.latest_session_status ?? "No session"}
            />
            <MetricCard
              label="Live action"
              value={data.overview?.live_action ?? data.overview?.summary_action ?? "-"}
            />
            <MetricCard
              label="Latest emotion"
              value={data.overview?.live_emotion ?? data.overview?.summary_emotion ?? "-"}
            />
            <MetricCard
              label="Latest distraction"
              value={
                String(
                  data.overview?.live_distraction ??
                    data.overview?.summary_distraction ??
                    "-",
                )
              }
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <SessionLauncher
            childId={data.child.id}
            defaultDifficulty={data.child.baseline_difficulty}
            defaultGainCapability={data.child.baseline_gain_capability}
          />

          <Panel
            description="Recent sessions captured from the platform session table."
            title="Recent sessions"
          >
            {data.sessions.length === 0 ? (
              <EmptyState message="No sessions have been recorded for this child yet." />
            ) : (
              <div className="space-y-3">
                {data.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {session.status} session
                        </p>
                        <p className="text-xs text-slate-500">
                          Started {formatDate(session.started_at)}
                        </p>
                      </div>
                      <div className="text-xs text-slate-500">
                        {session.baseline_calibrated
                          ? "Baseline calibrated"
                          : "Baseline not calibrated"}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-4">
                      <div>Emotion: {session.summary_emotion ?? "-"}</div>
                      <div>Distraction: {session.summary_distraction ?? "-"}</div>
                      <div>Noise: {session.summary_noise_level ?? "-"}</div>
                      <div>Action: {session.summary_action ?? "-"}</div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Ended {formatDate(session.ended_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            description="Latest alerts generated for this child across study sessions."
            title="Alerts"
          >
            {data.alerts.length === 0 ? (
              <EmptyState message="No alerts have been recorded yet." />
            ) : (
              <div className="space-y-3">
                {data.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-amber-700">
                          {alert.type}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatDate(alert.created_at)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {alert.message}
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      {alert.acknowledged_at
                        ? `Acknowledged ${formatDate(alert.acknowledged_at)}`
                        : "Not acknowledged"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <ChildManagement data={data} parentOptions={parentOptions} profile={profile} />

          <Panel
            description="Parent/admin-facing context stored on the child and child_profile records."
            title="Profile notes"
          >
            <div className="space-y-4 text-sm leading-6 text-slate-600">
              <InfoRow label="Full name" value={data.child.full_name} />
              <InfoRow label="Date of birth" value={data.child.date_of_birth ?? "Not set"} />
              <InfoRow label="Created" value={formatDate(data.child.created_at)} />
              <InfoRow label="General notes" value={data.child.notes ?? "No notes added"} />
              <InfoRow
                label="Sensory notes"
                value={data.profile?.sensory_notes ?? "No sensory notes yet"}
              />
              <InfoRow
                label="Learning notes"
                value={data.profile?.learning_notes ?? "No learning notes yet"}
              />
              <InfoRow
                label="Medical notes"
                value={data.profile?.medical_notes ?? "No medical notes yet"}
              />
              <InfoRow
                label="Preferred interventions"
                value={formatList(data.profile?.preferred_interventions ?? [])}
              />
              <InfoRow
                label="Avoided interventions"
                value={formatList(data.profile?.avoided_interventions ?? [])}
              />
            </div>
          </Panel>

          <Panel
            description="Most recent aggregated report from child_progress_reports."
            title="Latest report"
          >
            {data.latestReport === null ? (
              <EmptyState message="No aggregated report is available yet." />
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-teal-800">
                    {data.latestReport.period} report
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {data.latestReport.period_start} to {data.latestReport.period_end}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricCard
                    label="Sessions"
                    value={data.latestReport.session_count}
                  />
                  <MetricCard
                    label="Interventions"
                    value={data.latestReport.total_interventions}
                  />
                  <MetricCard
                    label="Avg distraction"
                    value={data.latestReport.avg_distraction ?? "-"}
                  />
                  <MetricCard
                    label="Avg noise"
                    value={data.latestReport.avg_noise_level ?? "-"}
                  />
                </div>
                <div className="space-y-2 text-sm leading-6 text-slate-600">
                  <InfoRow
                    label="Dominant emotion"
                    value={data.latestReport.dominant_emotion ?? "-"}
                  />
                  <InfoRow
                    label="Dominant action"
                    value={data.latestReport.dominant_action ?? "-"}
                  />
                  <InfoRow
                    label="Summary"
                    value={data.latestReport.summary ?? "No summary written"}
                  />
                </div>
              </div>
            )}
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Panel({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-700">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
      {message}
    </div>
  );
}
