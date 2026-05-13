import { requireAdmin } from "@/lib/utils/auth-guard";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { FileText, UserPlus } from "lucide-react";
import AdminReportsClient from "./_components/admin-reports-client";
import { getAdminReportsList } from "@/lib/queries/admin-list.query";

export const metadata = { title: "Manajemen Laporan — LostFound SMKFN" };

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    category?: string;
    type?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const result = await getAdminReportsList(params);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        icon={FileText}
        title="Manajemen Laporan"
        subtitle="Verifikasi, kelola, dan tinjau semua laporan yang masuk"
        badge={`${result.counts.Semua ?? 0} total`}
      />

      <div className="flex items-center gap-3">
        <Link
          href="/admin/reports/guest"
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors shadow-sm"
        >
          <UserPlus size={15} /> Lapor untuk Tamu
        </Link>
        <Link
          href="/admin/reports/proxy"
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-slate-700 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
        >
          <UserPlus size={15} /> Lapor untuk User
        </Link>
      </div>

      <AdminReportsClient
        reports={result.items}
        counts={result.counts}
        categories={result.categories}
        filters={result.filters}
        pagination={result.pagination}
      />
    </div>
  );
}
