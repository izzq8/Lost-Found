import { requireAdmin } from "@/lib/utils/auth-guard";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { ClipboardList, UserCheck } from "lucide-react";
import AdminClaimsClient from "./_components/admin-claims-client";
import { getAdminClaimsList } from "@/lib/queries/admin-list.query";

export const metadata = { title: "Manajemen Klaim — LostFound SMKFN" };

export default async function AdminClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    category?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const result = await getAdminClaimsList(params);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        icon={ClipboardList}
        title="Manajemen Klaim"
        subtitle="Tinjau dan proses pengajuan klaim dari pengguna"
        badge={`${result.counts.PENDING ?? 0} menunggu`}
      >
        <Link
          href="/admin/claims/manual"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-orange-600 text-sm font-bold hover:bg-orange-50 transition-colors shadow-lg"
        >
          <UserCheck size={15} /> Klaim Manual
        </Link>
      </PageHero>

      <AdminClaimsClient
        claims={result.items}
        counts={result.counts}
        categories={result.categories}
        filters={result.filters}
        pagination={result.pagination}
      />
    </div>
  );
}
