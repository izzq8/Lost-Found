import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { UserCheck } from "lucide-react";
import Link from "next/link";
import ManualClaimClient from "./_components/manual-claim-client";

export const metadata = {
  title: "Klaim Manual — LostFound SMKFN",
};

export default async function ManualClaimPage({ searchParams }: { searchParams: Promise<{ reportId?: string }> }) {
  const { user } = await requireAdmin();
  const resolvedParams = await searchParams;
  const preSelectedReportId = resolvedParams.reportId || null;

  // Ambil laporan yang bisa diklaim (VERIFIED, belum CLAIMED)
  const reports = await prisma.report.findMany({
    where: { status: "VERIFIED" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      itemName: true,
      location: true,
      category: { select: { name: true } },
      date: true,
    },
  });

  const serializedReports = reports.map((r) => ({
    id: r.id,
    type: r.type,
    itemName: r.itemName,
    location: r.location,
    categoryName: r.category.name,
    date: r.date.toISOString().split("T")[0],
  }));

  // Ambil daftar user terdaftar untuk pilihan pengambil
  const users = await prisma.profile.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, jabatan: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/claims"
        className="flex items-center gap-1 text-orange-600 hover:underline w-fit text-sm font-medium"
      >
        ← Kembali ke Daftar Klaim
      </Link>

      <PageHero
        variant="default"
        icon={UserCheck}
        title="Klaim Manual"
        subtitle="Proses klaim barang untuk pengambilan langsung di Front Office (offline/tamu)"
      />

      <ManualClaimClient
        reports={serializedReports}
        users={users}
        adminId={user.id}
        preSelectedReportId={preSelectedReportId}
      />
    </div>
  );
}
