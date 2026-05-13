import { requireAdmin } from "@/lib/utils/auth-guard";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { Users, UserPlus } from "lucide-react";
import AdminUsersClient from "./_components/admin-users-client";
import { getAdminUsersList } from "@/lib/queries/admin-list.query";

export const metadata = { title: "Manajemen Pengguna — LostFound SMKFN" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    role?: string;
    jabatan?: string;
  }>;
}) {
  const { user } = await requireAdmin();
  const params = await searchParams;

  const result = await getAdminUsersList(params);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        icon={Users}
        title="Manajemen Pengguna"
        subtitle="Kelola akun pengguna dan status aktivasi"
        badge={`${result.counts.active + result.counts.inactive} user`}
      >
        <Link
          href="/admin/users/create-admin"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-orange-600 text-sm font-bold hover:bg-orange-50 transition-colors shadow-lg"
        >
          <UserPlus size={15} /> Buat Akun Admin
        </Link>
      </PageHero>

      <AdminUsersClient
        users={result.items}
        counts={result.counts}
        filters={result.filters}
        pagination={result.pagination}
        currentUserId={user.id}
      />
    </div>
  );
}
