import { notFound } from "next/navigation";

import { ChildDetail } from "@/components/dashboard/child-detail";
import { requireRole } from "@/lib/auth";
import { getChildDashboardData, getParentOptions } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function AdminChildPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const profile = await requireRole("platform_admin");
  const { childId } = await params;
  const [data, parentOptions] = await Promise.all([
    getChildDashboardData(childId),
    getParentOptions(),
  ]);

  if (data === null) {
    notFound();
  }

  return (
    <ChildDetail
      backHref="/admin"
      backLabel="Back to admin overview"
      data={data}
      parentOptions={parentOptions}
      profile={profile}
    />
  );
}
