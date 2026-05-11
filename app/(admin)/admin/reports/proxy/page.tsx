import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { UserPlus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ProxyReportForm from "./_components/proxy-report-form";

export const metadata = {
  title: "Laporan untuk User — LostFound SMKFN",
};

export default async function ProxyReportPage() {
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
        title="Laporan Atas Nama User"
        subtitle="Buat laporan atas nama user terdaftar di sistem"
      />

      <ProxyReportForm categories={categories} />
    </div>
  );
}
