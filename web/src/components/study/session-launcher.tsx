"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SessionLauncher({
  childId,
  defaultDifficulty,
  defaultGainCapability,
}: {
  childId: string;
  defaultDifficulty: number;
  defaultGainCapability: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleStart(formData: FormData) {
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          childId,
          difficulty: Number(formData.get("difficulty") ?? defaultDifficulty),
          gainCapability: Number(formData.get("gain_capability") ?? defaultGainCapability),
          activityLabel: String(formData.get("activity_label") ?? "").trim(),
        }),
      });

      const result = (await response.json()) as { error?: string; route?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create session.");
      }

      router.push(result.route ?? "/parent");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to create session.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">
          Start study session
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Launch the browser-based child study flow. The session will begin in
          calibration mode and wait for the realtime engine connection.
        </p>
      </div>
      <form
        action={(formData) => {
          void handleStart(formData);
        }}
        className="mt-5 grid gap-3"
      >
        <input
          className={inputClass}
          defaultValue="guided_study"
          name="activity_label"
          placeholder="Activity label"
        />
        <label className={rangeWrapClass}>
          <span className={rangeLabelClass}>Initial difficulty</span>
          <input
            className="mt-2 w-full"
            defaultValue={defaultDifficulty}
            max={4}
            min={0}
            name="difficulty"
            type="range"
          />
        </label>
        <label className={rangeWrapClass}>
          <span className={rangeLabelClass}>Initial gain capability</span>
          <input
            className="mt-2 w-full"
            defaultValue={defaultGainCapability}
            max={4}
            min={0}
            name="gain_capability"
            type="range"
          />
        </label>
        {error ? <p className={errorClass}>{error}</p> : null}
        <button className={buttonClass} disabled={pending} type="submit">
          {pending ? "Creating session..." : "Open study screen"}
        </button>
      </form>
    </section>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500";
const rangeWrapClass =
  "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700";
const rangeLabelClass = "text-xs uppercase tracking-[0.16em] text-slate-500";
const buttonClass =
  "inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60";
const errorClass = "rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700";
