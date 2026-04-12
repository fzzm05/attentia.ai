import Link from "next/link";

import type { ChildOverview } from "@/lib/supabase/types";

export function ChildrenTable({
  rows,
  detailBasePath,
  emptyMessage,
}: {
  rows: ChildOverview[];
  detailBasePath?: string;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-4 font-medium text-slate-600">Child</th>
              <th className="px-5 py-4 font-medium text-slate-600">Status</th>
              <th className="px-5 py-4 font-medium text-slate-600">Latest session</th>
              <th className="px-5 py-4 font-medium text-slate-600">Emotion</th>
              <th className="px-5 py-4 font-medium text-slate-600">Distraction</th>
              <th className="px-5 py-4 font-medium text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((child) => (
              <tr key={child.child_id}>
                <td className="px-5 py-4">
                  {detailBasePath ? (
                    <Link
                      className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
                      href={`${detailBasePath}/${child.child_id}`}
                    >
                      {child.preferred_name || child.full_name}
                    </Link>
                  ) : (
                    <div className="font-medium text-slate-900">
                      {child.preferred_name || child.full_name}
                    </div>
                  )}
                  <div className="text-xs text-slate-500">{child.full_name}</div>
                </td>
                <td className="px-5 py-4 capitalize text-slate-700">{child.status}</td>
                <td className="px-5 py-4 text-slate-700">
                  {child.latest_session_status || "No session"}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {child.live_emotion || child.summary_emotion || "-"}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {child.live_distraction ?? child.summary_distraction ?? "-"}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {child.live_action || child.summary_action || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
