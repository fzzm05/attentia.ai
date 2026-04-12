import { AppShell } from "@/components/dashboard/app-shell";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("parent");

  return <AppShell profile={profile}>{children}</AppShell>;
}
