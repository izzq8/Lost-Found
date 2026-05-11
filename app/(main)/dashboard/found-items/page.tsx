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
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 text-white text-sm font-semibold hover:bg-white/30 transition-colors border border-white/20"
        >
          <PenLine size={15} /> Lapor Barang Ditemukan
        </Link>
      </PageHero>

      <FoundItemsFilterClient reports={serialized} categories={categories} />
    </div>
  );
}
