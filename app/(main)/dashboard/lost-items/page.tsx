import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { ItemCard } from "@/components/shared/item-card";
import { Package, PenLine } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Barang Hilang — LostFound SMKFN",
  description: "Daftar semua laporan barang hilang di SMK Forward Nusantara",
};

export default async function LostItemsPage() {
  await requireAuth();

  const reports = await prisma.report.findMany({
    where: { type: "LOST", status: { in: ["VERIFIED", "AWAITING_PICKUP", "CLAIMED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      images: { take: 1, orderBy: { createdAt: "asc" } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        variant="default"
        icon={Package}
        title="Barang Hilang"
        subtitle={`${reports.length} laporan aktif`}
        badge={`${reports.length}`}
      >
        <Link
          href="/dashboard/report/lost"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 text-white text-sm font-semibold hover:bg-white/30 transition-colors border border-white/20"
        >
          <PenLine size={15} /> Lapor Barang Hilang
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
            <Package size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-600 font-medium">Belum ada laporan barang hilang</p>
          <Link
            href="/dashboard/report/lost"
            className="text-orange-600 text-sm font-medium hover:underline flex items-center gap-1"
          >
            <PenLine size={14} /> Buat laporan pertama
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
                reportImageUrl: report.images[0]?.url,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
