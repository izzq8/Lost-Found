import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { FileText, UserPlus } from "lucide-react";
import AdminReportsClient from "./_components/admin-reports-client";

export const metadata = { title: "Manajemen Laporan — LostFound SMKFN" };

export default async function AdminReportsPage() {
  await requireAdmin();

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { name: true, jabatan: true } },
      category: { select: { name: true, imageUrl: true } },
      images: { take: 1, select: { url: true } },
      foundMatches: {
        where: { status: { in: ["APPROVED", "ITEM_RECEIVED", "COMPLETED"] } },
        select: { finder: { select: { name: true } }, handoverPhotoUrl: true, pickupPhotoUrl: true },
        take: 1,
      },
      claims: {
        where: { status: { in: ["APPROVED", "COMPLETED"] } },
        select: { claimant: { select: { name: true } }, handoverPhotoUrl: true },
        take: 1,
      },
    },
  });

  const serialized = reports.map((r) => ({
    id: r.id,
    type: r.type as string,
    status: r.status as string,
    itemName: r.itemName,
    category: r.category.name,
    categoryImageUrl: r.category.imageUrl,
    imageUrl: r.images.length > 0 ? r.images[0].url : null,
    location: r.location,
    date: r.date.toISOString(),
    createdAt: r.createdAt.toISOString(),
    reporterName: r.reporter.name,
    reporterJabatan: r.reporter.jabatan as string,
    finderName: r.foundMatches[0]?.finder?.name || null,
    claimantName: r.claims[0]?.claimant?.name || null,
    handoverPhotoUrl: r.foundMatches[0]?.handoverPhotoUrl || r.claims[0]?.handoverPhotoUrl || null,
    pickupPhotoUrl: r.foundMatches[0]?.pickupPhotoUrl || null,
  }));

  const pendingCount = reports.filter((r) => r.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        icon={FileText}
        title="Manajemen Laporan"
        subtitle="Verifikasi, kelola, dan tinjau semua laporan yang masuk"
        badge={`${reports.length} total`}
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

      <AdminReportsClient reports={serialized} pendingCount={pendingCount} />
    </div>
  );
}
