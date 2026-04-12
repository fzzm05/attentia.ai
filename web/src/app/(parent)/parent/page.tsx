import { ParentChildCreator } from "@/components/dashboard/child-management";
import { ChildrenTable } from "@/components/dashboard/children-table";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { getParentChildrenOverview } from "@/lib/dashboard";

export default async function ParentPage() {
  const children = await getParentChildrenOverview();

  return (
    <main className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="My children" value={children.length} />
        <SummaryCard
          label="Currently active sessions"
          value={children.filter((child) => child.latest_session_status === "running").length}
        />
        <SummaryCard
          label="Children with live state"
          tone="accent"
          value={children.filter((child) => child.live_recorded_at).length}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            My children
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Session summaries and live state data visible to the signed-in parent.
          </p>
        </div>
        <ChildrenTable
          detailBasePath="/parent/children"
          emptyMessage="No children are attached to this parent account yet."
          rows={children}
        ></ChildrenTable>
      </section>

      <ParentChildCreator />
    </main>
  );
}
