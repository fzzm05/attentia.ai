"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type {
  ChildDashboardData,
  ParentOption,
  Profile,
} from "@/lib/supabase/types";

export function ChildManagement({
  profile,
  data,
  parentOptions,
}: {
  profile: Profile;
  data: ChildDashboardData;
  parentOptions: ParentOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSave(formData: FormData) {
    setError("");
    setPending(true);

    try {
      const response = await fetch(`/api/children/${data.child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentAccountId: String(formData.get("parent_account_id") ?? "").trim(),
          fullName: String(formData.get("full_name") ?? "").trim(),
          preferredName: String(formData.get("preferred_name") ?? "").trim(),
          dateOfBirth: String(formData.get("date_of_birth") ?? "").trim(),
          status: String(formData.get("status") ?? "").trim(),
          notes: String(formData.get("notes") ?? "").trim(),
          baselineDifficulty: Number(formData.get("baseline_difficulty") ?? 2),
          baselineGainCapability: Number(formData.get("baseline_gain_capability") ?? 2),
          sensoryNotes: String(formData.get("sensory_notes") ?? "").trim(),
          learningNotes: String(formData.get("learning_notes") ?? "").trim(),
          medicalNotes: String(formData.get("medical_notes") ?? "").trim(),
          preferredInterventions: String(formData.get("preferred_interventions") ?? "").trim(),
          avoidedInterventions: String(formData.get("avoided_interventions") ?? "").trim(),
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save child profile.");
      }

      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save child profile.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete ${data.child.preferred_name || data.child.full_name} and all linked session data?`,
      )
    ) {
      return;
    }

    setError("");
    setPending(true);

    try {
      const response = await fetch(`/api/children/${data.child.id}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to delete child.");
      }

      router.push(profile.role === "platform_admin" ? "/admin" : "/parent");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to delete child.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">
          Manage child record
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          {profile.role === "platform_admin"
            ? "Admins can update or delete this child and move them between parent accounts."
            : "Parents can keep child details and notes current from here."}
        </p>
      </div>
      <form
        action={(formData) => {
          void handleSave(formData);
        }}
        className="mt-5 grid gap-3"
      >
        {profile.role === "platform_admin" ? (
          <select className={inputClass} defaultValue={data.child.parent_account_id} name="parent_account_id">
            {parentOptions.map((parent) => (
              <option key={parent.parent_account_id} value={parent.parent_account_id}>
                {parent.full_name} {parent.email ? `(${parent.email})` : ""}
              </option>
            ))}
          </select>
        ) : null}
        <input className={inputClass} defaultValue={data.child.full_name} name="full_name" placeholder="Child full name" />
        <input className={inputClass} defaultValue={data.child.preferred_name ?? ""} name="preferred_name" placeholder="Preferred name" />
        <input className={inputClass} defaultValue={data.child.date_of_birth ?? ""} name="date_of_birth" type="date" />
        <select className={inputClass} defaultValue={data.child.status} name="status">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
        <textarea className={textareaClass} defaultValue={data.child.notes ?? ""} name="notes" placeholder="General notes" />
        <label className={rangeWrapClass}>
          <span className={rangeLabelClass}>Baseline difficulty</span>
          <input className="mt-2 w-full" defaultValue={data.child.baseline_difficulty} max={4} min={0} name="baseline_difficulty" type="range" />
        </label>
        <label className={rangeWrapClass}>
          <span className={rangeLabelClass}>Gain capability</span>
          <input className="mt-2 w-full" defaultValue={data.child.baseline_gain_capability} max={4} min={0} name="baseline_gain_capability" type="range" />
        </label>
        <textarea className={textareaClass} defaultValue={data.profile?.sensory_notes ?? ""} name="sensory_notes" placeholder="Sensory notes" />
        <textarea className={textareaClass} defaultValue={data.profile?.learning_notes ?? ""} name="learning_notes" placeholder="Learning notes" />
        <textarea className={textareaClass} defaultValue={data.profile?.medical_notes ?? ""} name="medical_notes" placeholder="Medical notes" />
        <input className={inputClass} defaultValue={(data.profile?.preferred_interventions ?? []).join(", ")} name="preferred_interventions" placeholder="Preferred interventions, comma separated" />
        <input className={inputClass} defaultValue={(data.profile?.avoided_interventions ?? []).join(", ")} name="avoided_interventions" placeholder="Avoided interventions, comma separated" />
        {error ? <p className={errorClass}>{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button className={buttonClass} disabled={pending} type="submit">
            {pending ? "Saving..." : "Save changes"}
          </button>
          {profile.role === "platform_admin" ? (
            <button className={dangerButtonClass} disabled={pending} onClick={() => void handleDelete()} type="button">
              Delete child
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

export function ParentChildCreator() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(formData.get("full_name") ?? "").trim(),
          preferredName: String(formData.get("preferred_name") ?? "").trim(),
          dateOfBirth: String(formData.get("date_of_birth") ?? "").trim(),
          notes: String(formData.get("notes") ?? "").trim(),
          sensoryNotes: String(formData.get("sensory_notes") ?? "").trim(),
          learningNotes: String(formData.get("learning_notes") ?? "").trim(),
          medicalNotes: String(formData.get("medical_notes") ?? "").trim(),
          preferredInterventions: String(formData.get("preferred_interventions") ?? "").trim(),
          avoidedInterventions: String(formData.get("avoided_interventions") ?? "").trim(),
          baselineDifficulty: Number(formData.get("baseline_difficulty") ?? 2),
          baselineGainCapability: Number(formData.get("baseline_gain_capability") ?? 2),
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create child.");
      }

      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to create child.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Add child</h2>
        <p className="mt-1 text-sm text-slate-600">
          Parents can add and maintain their own children from the dashboard.
        </p>
      </div>
      <form
        action={(formData) => {
          void handleSubmit(formData);
        }}
        className="mt-5 grid gap-3"
      >
        <input className={inputClass} name="full_name" placeholder="Child full name" />
        <input className={inputClass} name="preferred_name" placeholder="Preferred name" />
        <input className={inputClass} name="date_of_birth" type="date" />
        <textarea className={textareaClass} name="notes" placeholder="General notes" />
        <textarea className={textareaClass} name="sensory_notes" placeholder="Sensory notes" />
        <textarea className={textareaClass} name="learning_notes" placeholder="Learning notes" />
        <textarea className={textareaClass} name="medical_notes" placeholder="Medical notes" />
        <input className={inputClass} name="preferred_interventions" placeholder="Preferred interventions, comma separated" />
        <input className={inputClass} name="avoided_interventions" placeholder="Avoided interventions, comma separated" />
        <label className={rangeWrapClass}>
          <span className={rangeLabelClass}>Baseline difficulty</span>
          <input className="mt-2 w-full" defaultValue={2} max={4} min={0} name="baseline_difficulty" type="range" />
        </label>
        <label className={rangeWrapClass}>
          <span className={rangeLabelClass}>Gain capability</span>
          <input className="mt-2 w-full" defaultValue={2} max={4} min={0} name="baseline_gain_capability" type="range" />
        </label>
        {error ? <p className={errorClass}>{error}</p> : null}
        <button className={buttonClass} disabled={pending} type="submit">
          {pending ? "Adding child..." : "Add child"}
        </button>
      </form>
    </section>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500";
const textareaClass =
  "min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500";
const rangeWrapClass =
  "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700";
const rangeLabelClass = "text-xs uppercase tracking-[0.16em] text-slate-500";
const buttonClass =
  "inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60";
const dangerButtonClass =
  "inline-flex items-center justify-center rounded-full bg-rose-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-60";
const errorClass = "rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700";
