import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
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

  const unreadCount = await prisma.notification.count({
    where: { userId: profile.id, isRead: false },
  });

  const [pendingReportsCount, pendingClaimsCount, pendingFoundMatchCount] = await Promise.all([
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.claim.count({ where: { status: "PENDING" } }),
    prisma.foundMatch.count({ where: { status: "PENDING" } }),
  ]);

  const clientUser = {
    id: profile.id,
    name: profile.name,
    jabatan: profile.jabatan.toLowerCase().replace(/_/g, " "),
    avatarInitials: profile.name.substring(0, 2).toUpperCase(),
  };

  return (
    <AdminLayoutClient
      currentUser={clientUser}
      unreadCount={unreadCount}
      pendingReportsCount={pendingReportsCount}
      pendingClaimsCount={pendingClaimsCount}
      pendingFoundMatchCount={pendingFoundMatchCount}
    >
      {children}
    </AdminLayoutClient>
  );
}
