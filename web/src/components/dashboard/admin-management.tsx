"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ParentAccountSummary, ParentOption } from "@/lib/supabase/types";

function SectionCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function AdminManagement({
  parentAccounts,
  parentOptions,
}: {
  parentAccounts: ParentAccountSummary[];
  parentOptions: ParentOption[];
}) {
  const router = useRouter();
  const [parentError, setParentError] = useState("");
  const [childError, setChildError] = useState("");
  const [pendingParent, setPendingParent] = useState(false);
  const [pendingChild, setPendingChild] = useState(false);

  async function handleParentSubmit(formData: FormData) {
    setParentError("");
    setPendingParent(true);

    try {
      const response = await fetch("/api/admin/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(formData.get("email") ?? "").trim(),
          fullName: String(formData.get("full_name") ?? "").trim(),
          password: String(formData.get("password") ?? ""),
          phone: String(formData.get("phone") ?? "").trim(),
          emergencyContactName: String(formData.get("emergency_contact_name") ?? "").trim(),
          emergencyContactPhone: String(formData.get("emergency_contact_phone") ?? "").trim(),
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create parent account.");
      }

      router.refresh();
    } catch (error) {
      setParentError(error instanceof Error ? error.message : "Unable to create parent.");
    } finally {
      setPendingParent(false);
    }
  }

  async function handleChildSubmit(formData: FormData) {
    setChildError("");
    setPendingChild(true);

    try {
      const response = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentAccountId: String(formData.get("parent_account_id") ?? "").trim(),
          fullName: String(formData.get("full_name") ?? "").trim(),
          preferredName: String(formData.get("preferred_name") ?? "").trim(),
          dateOfBirth: String(formData.get("date_of_birth") ?? "").trim(),
          status: String(formData.get("status") ?? "active"),
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
        throw new Error(result.error ?? "Unable to create child.");
      }

      router.refresh();
    } catch (error) {
      setChildError(error instanceof Error ? error.message : "Unable to create child.");
    } finally {
      setPendingChild(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <SectionCard
        description="Create parent users directly from the admin surface."
        title="Create parent"
      >
        <form
          action={(formData) => {
            void handleParentSubmit(formData);
          }}
          className="grid gap-3"
        >
          <input className={inputClass} name="full_name" placeholder="Parent full name" />
          <input className={inputClass} name="email" placeholder="parent@example.com" type="email" />
          <input className={inputClass} name="password" placeholder="Temporary password" type="password" />
          <input className={inputClass} name="phone" placeholder="Phone number" />
          <input className={inputClass} name="emergency_contact_name" placeholder="Emergency contact name" />
          <input className={inputClass} name="emergency_contact_phone" placeholder="Emergency contact phone" />
          {parentError ? <p className={errorClass}>{parentError}</p> : null}
          <button className={buttonClass} disabled={pendingParent} type="submit">
            {pendingParent ? "Creating parent..." : "Create parent"}
          </button>
        </form>
      </SectionCard>

      <SectionCard
        description="Add a child under any existing parent account."
        title="Create child"
      >
        <form
          action={(formData) => {
            void handleChildSubmit(formData);
          }}
          className="grid gap-3"
        >
          <select className={inputClass} defaultValue="" name="parent_account_id">
            <option disabled value="">
              Select parent
            </option>
            {parentOptions.map((parent) => (
              <option key={parent.parent_account_id} value={parent.parent_account_id}>
                {parent.full_name} {parent.email ? `(${parent.email})` : ""}
              </option>
            ))}
          </select>
          <input className={inputClass} name="full_name" placeholder="Child full name" />
          <input className={inputClass} name="preferred_name" placeholder="Preferred name" />
          <input className={inputClass} name="date_of_birth" type="date" />
          <textarea className={textareaClass} name="notes" placeholder="General notes" />
          <div className="grid gap-3 sm:grid-cols-2">
            <RangeField name="baseline_difficulty" label="Baseline difficulty" />
            <RangeField name="baseline_gain_capability" label="Gain capability" />
          </div>
          <textarea className={textareaClass} name="sensory_notes" placeholder="Sensory notes" />
          <textarea className={textareaClass} name="learning_notes" placeholder="Learning notes" />
          <textarea className={textareaClass} name="medical_notes" placeholder="Medical notes" />
          <input className={inputClass} name="preferred_interventions" placeholder="Preferred interventions, comma separated" />
          <input className={inputClass} name="avoided_interventions" placeholder="Avoided interventions, comma separated" />
          {childError ? <p className={errorClass}>{childError}</p> : null}
          <button className={buttonClass} disabled={pendingChild} type="submit">
            {pendingChild ? "Creating child..." : "Create child"}
          </button>
        </form>
      </SectionCard>

      <SectionCard
        description="Edit or remove parent accounts as the platform admin."
        title="Parent records"
      >
        <div className="space-y-4">
          {parentAccounts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No parent accounts exist yet.
            </p>
          ) : (
            parentAccounts.map((parent) => (
              <ParentEditor key={parent.profile_id} parent={parent} />
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function ParentEditor({ parent }: { parent: ParentAccountSummary }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSave(formData: FormData) {
    setError("");
    setPending(true);

    try {
      const response = await fetch(`/api/admin/parents/${parent.profile_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(formData.get("full_name") ?? "").trim(),
          phone: String(formData.get("phone") ?? "").trim(),
          emergencyContactName: String(formData.get("emergency_contact_name") ?? "").trim(),
          emergencyContactPhone: String(formData.get("emergency_contact_phone") ?? "").trim(),
          onboardingCompleted: formData.get("onboarding_completed") === "on",
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update parent.");
      }

      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to update parent.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${parent.full_name} and all linked child data?`)) {
      return;
    }

    setError("");
    setPending(true);

    try {
      const response = await fetch(`/api/admin/parents/${parent.profile_id}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to delete parent.");
      }

      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to delete parent.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      action={(formData) => {
        void handleSave(formData);
      }}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <input className={inputClass} defaultValue={parent.full_name} name="full_name" />
        <input className={inputClass} defaultValue={parent.email ?? ""} disabled />
        <input className={inputClass} defaultValue={parent.phone ?? ""} name="phone" placeholder="Phone number" />
        <input
          className={inputClass}
          defaultValue={parent.emergency_contact_name ?? ""}
          name="emergency_contact_name"
          placeholder="Emergency contact name"
        />
        <input
          className={inputClass}
          defaultValue={parent.emergency_contact_phone ?? ""}
          name="emergency_contact_phone"
          placeholder="Emergency contact phone"
        />
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <input defaultChecked={parent.onboarding_completed} id={`onboarding-${parent.profile_id}`} name="onboarding_completed" type="checkbox" />
          <label htmlFor={`onboarding-${parent.profile_id}`}>
            Onboarding completed
          </label>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{parent.child_count} linked children</p>
      {error ? <p className={`${errorClass} mt-3`}>{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button className={buttonClass} disabled={pending} type="submit">
          {pending ? "Saving..." : "Save parent"}
        </button>
        <button className={dangerButtonClass} disabled={pending} onClick={() => void handleDelete()} type="button">
          Delete parent
        </button>
      </div>
    </form>
  );
}

function RangeField({ label, name }: { label: string; name: string }) {
  return (
    <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <span className="block text-xs uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <input className="mt-2 w-full" defaultValue={2} max={4} min={0} name={name} type="range" />
    </label>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500";
const textareaClass =
  "min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500";
const buttonClass =
  "inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60";
const dangerButtonClass =
  "inline-flex items-center justify-center rounded-full bg-rose-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-60";
const errorClass = "rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700";
