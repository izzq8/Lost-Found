import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { ClipboardList, ArrowLeft, UserCheck } from "lucide-react";
import AdminClaimsClient from "./_components/admin-claims-client";

export const metadata = { title: "Manajemen Klaim — LostFound SMKFN" };

export default async function AdminClaimsPage() {
  await requireAdmin();

  const claims = await prisma.claim.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      claimant: { select: { name: true, jabatan: true } },
      report: {
        select: {
          itemName: true,
          category: { select: { name: true, imageUrl: true } },
          images: { take: 1, select: { url: true } },
        },
      },
    },
  });

  const serialized = claims.map((c) => ({
    id: c.id,
    status: c.status as string,
    claimantName: c.claimant.name,
    claimantJabatan: c.claimant.jabatan as string,
    itemName: c.report.itemName,
    category: c.report.category.name,
    imageUrl: c.report.images.length > 0 ? c.report.images[0].url : null,
    categoryImageUrl: c.report.category.imageUrl,
    createdAt: c.createdAt.toISOString(),
    handoverPhotoUrl: c.handoverPhotoUrl || null,
  }));

  const pendingCount = claims.filter((c) => c.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="flex items-center gap-1 text-orange-600 hover:underline w-fit text-sm font-medium">
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </Link>

      <PageHero
        icon={ClipboardList}
        title="Manajemen Klaim"
        subtitle="Tinjau dan proses pengajuan klaim dari pengguna"
        badge={`${pendingCount} menunggu`}
      >
        <Link
          href="/admin/claims/manual"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 text-white text-sm font-semibold hover:bg-white/30 transition-colors border border-white/20"
        >
          <UserCheck size={15} /> Klaim Manual
        </Link>
      </PageHero>

      <AdminClaimsClient claims={serialized} pendingCount={pendingCount} />
    </div>
  );
}
