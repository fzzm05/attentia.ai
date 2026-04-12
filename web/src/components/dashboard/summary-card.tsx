import clsx from "clsx";

export function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className={clsx(
        "rounded-[1.5rem] border p-5 shadow-sm",
        tone === "accent"
          ? "border-teal-200 bg-teal-50"
          : "border-slate-200 bg-white",
      )}
    >
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}
