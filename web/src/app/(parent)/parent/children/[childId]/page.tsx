import { notFound } from "next/navigation";

import { ChildDetail } from "@/components/dashboard/child-detail";
import { requireRole } from "@/lib/auth";
import { getChildDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function ParentChildPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const profile = await requireRole("parent");
  const { childId } = await params;
  const data = await getChildDashboardData(childId);

  if (data === null) {
    notFound();
  }

  return (
    <ChildDetail
      backHref="/parent"
      backLabel="Back to my children"
      data={data}
      parentOptions={[]}
      profile={profile}
    />
  );
}
