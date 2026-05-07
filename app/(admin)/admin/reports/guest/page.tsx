import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { UserPlus } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import GuestReportForm from "./_components/guest-report-form";

export const metadata = {
  title: "Laporan Tamu — LostFound SMKFN",
};

export default async function GuestReportPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/reports"
        className="flex items-center gap-1 text-orange-600 hover:underline w-fit text-sm font-medium"
      >
        <ArrowLeft size={16} /> Kembali ke Semua Laporan
      </Link>

      <PageHero
        variant="default"
        icon={UserPlus}
        title="Laporan Tamu"
        subtitle="Buat laporan atas nama tamu yang datang langsung ke Front Office"
      />

      <GuestReportForm categories={categories} />
    </div>
  );
}
