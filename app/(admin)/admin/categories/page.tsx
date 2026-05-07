import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { Tag, ArrowLeft } from "lucide-react";
import CategoriesClient from "./_components/categories-client";

export const metadata = { title: "Manajemen Kategori — LostFound SMKFN" };

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { reports: true } },
    },
  });

  const serialized = categories.map((c) => ({
    id: c.id,
    name: c.name,
    imageUrl: c.imageUrl,
    reportCount: c._count.reports,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="flex items-center gap-1 text-orange-600 hover:underline w-fit text-sm font-medium"
      >
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </Link>

      <PageHero
        icon={Tag}
        title="Manajemen Kategori"
        subtitle="Atur kategori barang untuk klasifikasi laporan"
        badge={`${categories.length} kategori`}
      />

      <CategoriesClient categories={serialized} />
    </div>
  );
}
