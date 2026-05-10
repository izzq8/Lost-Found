import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { Users, ArrowLeft } from "lucide-react";
import AdminUsersClient from "./_components/admin-users-client";

export const metadata = { title: "Manajemen Pengguna — LostFound SMKFN" };

export default async function AdminUsersPage() {
  const { user } = await requireAdmin();

  const users = await prisma.profile.findMany({
    orderBy: { createdAt: "desc" },
  });

  const serialized = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    jabatan: u.jabatan as string,
    role: u.role as string,
    status: u.status as string,
    createdAt: u.createdAt.toISOString(),
    avatarInitials: u.name.substring(0, 2).toUpperCase(),
  }));

  const counts = {
    active: users.filter((u) => u.status === "ACTIVE").length,
    inactive: users.filter((u) => u.status === "DEACTIVATED").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="flex items-center gap-1 text-orange-600 hover:underline w-fit text-sm font-medium">
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </Link>

      <PageHero
        icon={Users}
        title="Manajemen Pengguna"
        subtitle="Kelola akun pengguna dan status aktivasi"
        badge={`${users.length} user`}
      />

      <AdminUsersClient users={serialized} counts={counts} currentUserId={user.id} />
    </div>
  );
}
