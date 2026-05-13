import { requireAuth } from "@/lib/utils/auth-guard";
import { getPublicReportList } from "@/lib/queries/public-report-list.query";
import { PageHero } from "@/components/shared/page-hero";
import { Eye, PenLine } from "lucide-react";
import Link from "next/link";
import { FoundItemsFilterClient } from "./_components/items-filter-client";

export const metadata = {
  title: "Barang Ditemukan — LostFound SMKFN",
  description: "Daftar semua laporan barang ditemukan di SMK Forward Nusantara",
};

export default async function FoundItemsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    category?: string;
  }>;
}) {
  await requireAuth();
  const params = await searchParams;

  const result = await getPublicReportList({
    type: "FOUND",
    page: params.page,
    q: params.q,
    status: params.status,
    category: params.category,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        variant="default"
        icon={Eye}
        title="Barang Ditemukan"
        subtitle={`${result.counts.all} laporan barang ditemukan`}
      >
        <Link
          href="/dashboard/report/found"
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all group"
        >
          <PenLine size={16} className="text-green-600" strokeWidth={2.5} />
          <span className="text-sm font-bold text-slate-800">Lapor Barang Ditemukan</span>
        </Link>
      </PageHero>

      <FoundItemsFilterClient
        reports={result.items}
        categories={result.categories}
        counts={result.counts}
        filters={result.filters}
        pagination={result.pagination}
      />
    </div>
  );
}
