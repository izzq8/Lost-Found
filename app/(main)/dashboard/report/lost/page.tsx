import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import ReportFormClient from "../_components/report-form-client";

export const metadata = {
  title: "Lapor Barang Hilang — LostFound SMKFN",
  description: "Form untuk melaporkan barang yang hilang di lingkungan SMK Forward Nusantara",
};

export default async function ReportLostPage() {
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
        type="LOST"
        categories={categories}
        activeReportCount={activeCount}
      />
    </div>
  );
}
