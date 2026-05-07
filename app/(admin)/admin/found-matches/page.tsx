import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { SearchCheck, ArrowLeft } from "lucide-react";
import AdminFoundMatchesClient from "./_components/admin-found-matches-client";

export const metadata = { title: "Manajemen Found Match — LostFound SMKFN" };

export default async function AdminFoundMatchesPage() {
  await requireAdmin();

  const matches = await prisma.foundMatch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      finder: { select: { name: true, jabatan: true } },
      report: {
        select: {
          itemName: true,
          type: true,
          reporter: { select: { name: true } },
          category: { select: { name: true, imageUrl: true } },
          images: { take: 1, select: { url: true } },
        },
      },
      images: { take: 1, select: { url: true } },
    },
  });

  const serialized = matches.map((m) => ({
    id: m.id,
    status: m.status as string,
    finderName: m.finder.name,
    finderJabatan: m.finder.jabatan as string,
    itemName: m.report.itemName,
    ownerName: m.report.reporter.name,
    category: m.report.category.name,
    reportImageUrl: m.report.images.length > 0 ? m.report.images[0].url : null,
    matchImageUrl: m.images.length > 0 ? m.images[0].url : null,
    categoryImageUrl: m.report.category.imageUrl,
    description: m.description.length > 80 ? m.description.slice(0, 80) + "…" : m.description,
    createdAt: m.createdAt.toISOString(),
  }));

  const pendingCount = matches.filter((m) => m.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="flex items-center gap-1 text-orange-600 hover:underline w-fit text-sm font-medium">
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </Link>

      <PageHero
        icon={SearchCheck}
        title="Manajemen Found Match"
        subtitle="Tinjau laporan penemuan barang hilang dari pengguna"
        badge={`${pendingCount} menunggu`}
      />

      <AdminFoundMatchesClient matches={serialized} pendingCount={pendingCount} />
    </div>
  );
}
