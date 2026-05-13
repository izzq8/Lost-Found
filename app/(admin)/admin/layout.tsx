import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/utils/auth-guard";
import { getAdminNavigationSnapshot } from "@/lib/queries/navigation-snapshot.query";
import AdminLayoutClient from "@/components/admin/admin-layout-client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let profile;
  try {
    const auth = await requireAdmin();
    profile = auth.profile;
  } catch {
    redirect("/dashboard");
  }

  const snapshot = await getAdminNavigationSnapshot(profile);

  return (
    <AdminLayoutClient
      currentUser={snapshot.currentUser}
      unreadCount={snapshot.unreadCount}
      pendingReportsCount={snapshot.pendingReportsCount}
      pendingClaimsCount={snapshot.pendingClaimsCount}
      pendingFoundMatchCount={snapshot.pendingFoundMatchCount}
    >
      {children}
    </AdminLayoutClient>
  );
}
