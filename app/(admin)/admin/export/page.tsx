import { requireAdmin } from "@/lib/utils/auth-guard";
import { PageHero } from "@/components/shared/page-hero";
import { Download } from "lucide-react";
import Link from "next/link";
import ExportClient from "./_components/export-client";

export const metadata = {
  title: "Export Laporan — LostFound SMKFN",
};

export default async function ExportPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        variant="default"
        icon={Download}
        title="Export Laporan"
        subtitle="Unduh data laporan dalam format PDF atau Excel"
      />

      <ExportClient />
    </div>
  );
}
