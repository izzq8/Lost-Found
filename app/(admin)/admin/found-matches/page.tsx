import { requireAdmin } from "@/lib/utils/auth-guard";
import { PageHero } from "@/components/shared/page-hero";
import { SearchCheck } from "lucide-react";
import AdminFoundMatchesClient from "./_components/admin-found-matches-client";
import { getAdminFoundMatchesList } from "@/lib/queries/admin-list.query";

export const metadata = { title: "Manajemen Found Match - LostFound SMKFN" };

export default async function AdminFoundMatchesPage({
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
  const result = await getAdminFoundMatchesList(params);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        icon={SearchCheck}
        title="Manajemen Found Match"
        subtitle="Tinjau laporan penemuan barang hilang dari pengguna"
        badge={`${result.counts.PENDING ?? 0} menunggu`}
      />

      <AdminFoundMatchesClient
        matches={result.items}
        counts={result.counts}
        categories={result.categories}
        filters={result.filters}
        pagination={result.pagination}
      />
    </div>
  );
}
