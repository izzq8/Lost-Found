import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { Eye, PenLine } from "lucide-react";
import Link from "next/link";
import { FoundItemsFilterClient } from "./_components/items-filter-client";

export const metadata = {
  title: "Barang Ditemukan — LostFound SMKFN",
  description: "Daftar semua laporan barang ditemukan di SMK Forward Nusantara",
};

export default async function FoundItemsPage() {
  await requireAuth();

  const [reports, categories] = await Promise.all([
    prisma.report.findMany({
      where: { type: "FOUND" },
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        images: { take: 1, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.category.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized = reports.map((report) => ({
    id: report.id,
    type: report.type,
    status: report.status,
    itemName: report.itemName,
    location: report.location,
    date: report.date,
    category: { name: report.category.name, imageUrl: report.category.imageUrl ?? undefined },
    reportImageUrl: report.images[0]?.url,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        variant="default"
        icon={Eye}
        title="Barang Ditemukan"
        subtitle={`${reports.length} laporan barang ditemukan`}
      >
        <Link
          href="/dashboard/report/found"
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all group"
        >
          <PenLine size={16} className="text-green-600" strokeWidth={2.5} />
          <span className="text-sm font-bold text-slate-800">Lapor Barang Ditemukan</span>
        </Link>
      </PageHero>

      <FoundItemsFilterClient reports={serialized} categories={categories} />
    </div>
  );
}
