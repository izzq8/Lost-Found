import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import ReportFormClient from "../_components/report-form-client";

export const metadata = {
  title: "Lapor Barang Ditemukan — LostFound SMKFN",
  description: "Form untuk melaporkan barang yang ditemukan di lingkungan SMK Forward Nusantara",
};

export default async function ReportFoundPage() {
  const { user } = await requireAuth();

  const [categories, activeCount] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.report.count({
      where: {
        reporterId: user.id,
        status: { notIn: ["CLAIMED", "EXPIRED", "REJECTED", "RESOLVED"] },
      },
    }),
  ]);

  return (
    <div className="py-2">
      <ReportFormClient
        type="FOUND"
        categories={categories}
        activeReportCount={activeCount}
      />
    </div>
  );
}
