import { requireAuth } from "@/lib/utils/auth-guard";
import { getPublicReportList } from "@/lib/queries/public-report-list.query";
import { PageHero } from "@/components/shared/page-hero";
import { Package, PenLine } from "lucide-react";
import Link from "next/link";
import { LostItemsFilterClient } from "./_components/items-filter-client";

export const metadata = {
  title: "Barang Hilang — LostFound SMKFN",
  description: "Daftar semua laporan barang hilang di SMK Forward Nusantara",
};

export default async function LostItemsPage({
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
    type: "LOST",
    page: params.page,
    q: params.q,
    status: params.status,
    category: params.category,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        variant="default"
        icon={Package}
        title="Barang Hilang"
        subtitle={`${result.counts.all} laporan barang hilang`}
      >
        <Link
          href="/dashboard/report/lost"
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all group"
        >
          <PenLine size={16} className="text-red-500" strokeWidth={2.5} />
          <span className="text-sm font-bold text-slate-800">Lapor Barang Hilang</span>
        </Link>
      </PageHero>

      <LostItemsFilterClient
        reports={result.items}
        categories={result.categories}
        counts={result.counts}
        filters={result.filters}
        pagination={result.pagination}
      />
    </div>
  );
}
