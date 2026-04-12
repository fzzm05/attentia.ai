import { AdminManagement } from "@/components/dashboard/admin-management";
import { ChildrenTable } from "@/components/dashboard/children-table";
import { SummaryCard } from "@/components/dashboard/summary-card";
import {
  getAdminChildrenOverview,
  getAdminParentAccounts,
  getAdminSummary,
  getParentOptions,
} from "@/lib/dashboard";

export default async function AdminPage() {
  const [summary, children, parentAccounts, parentOptions] = await Promise.all([
    getAdminSummary(),
    getAdminChildrenOverview(),
    getAdminParentAccounts(),
    getParentOptions(),
  ]);

  return (
    <main className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Parents" value={summary.totalParents} />
        <SummaryCard label="Children" value={summary.totalChildren} />
        <SummaryCard label="Sessions" value={summary.totalSessions} />
        <SummaryCard label="Active sessions" tone="accent" value={summary.activeSessions} />
      </section>

      <AdminManagement
        parentAccounts={parentAccounts}
        parentOptions={parentOptions}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Children overview
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Pulled from the database overview view for quick admin visibility.
          </p>
        </div>
        <ChildrenTable
          detailBasePath="/admin/children"
          emptyMessage="No child records are available yet. Once parents and children are added, they will appear here."
          rows={children}
        ></ChildrenTable>
      </section>
    </main>
  );
}
