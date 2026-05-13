import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
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

  return <CategoriesClient categories={serialized} />;
}
