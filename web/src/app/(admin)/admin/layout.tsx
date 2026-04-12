import { AppShell } from "@/components/dashboard/app-shell";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("platform_admin");

  return <AppShell profile={profile}>{children}</AppShell>;
}
