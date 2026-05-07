import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { ItemCard } from "@/components/shared/item-card";
import { Eye, PenLine } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Barang Ditemukan — LostFound SMKFN",
  description: "Daftar semua laporan barang ditemukan di SMK Forward Nusantara",
};

export default async function FoundItemsPage() {
  await requireAuth();

  const reports = await prisma.report.findMany({
    where: { type: "FOUND", status: { in: ["VERIFIED", "AWAITING_PICKUP", "CLAIMED"] } },
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        variant="default"
        icon={Eye}
        title="Barang Ditemukan"
        subtitle={`${reports.length} laporan aktif`}
        badge={`${reports.length}`}
      >
        <Link
          href="/dashboard/report/found"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 text-white text-sm font-semibold hover:bg-white/30 transition-colors border border-white/20"
        >
          <PenLine size={15} /> Lapor Barang Ditemukan
        </Link>
      </PageHero>

      {reports.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center flex flex-col items-center gap-3"
          style={{
            background: "rgba(255,255,255,0.5)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.7)",
          }}
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Eye size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-600 font-medium">Belum ada laporan barang ditemukan</p>
          <Link
            href="/dashboard/report/found"
            className="text-orange-600 text-sm font-medium hover:underline flex items-center gap-1"
          >
            <PenLine size={14} /> Lapor barang yang Anda temukan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {reports.map((report) => (
            <ItemCard
              key={report.id}
              report={{
                id: report.id,
                type: report.type,
                status: report.status,
                itemName: report.itemName,
                location: report.location,
                date: report.date,
                category: { name: report.category.name, imageUrl: report.category.imageUrl },
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
