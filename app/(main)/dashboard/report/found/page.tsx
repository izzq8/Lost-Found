import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import ReportFormClient from "../_components/report-form-client";

export const metadata = {
  title: "Lapor Barang Ditemukan — LostFound SMKFN",
  description: "Form untuk melaporkan barang yang ditemukan di lingkungan SMK Forward Nusantara",
};

export default async function ReportFoundPage() {
  const { user } = await requireAuth();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [categories, dailyCount] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.report.count({
      where: {
        reporterId: user.id,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
  ]);

  return (
    <div className="py-2">
      <ReportFormClient
        type="FOUND"
        categories={categories}
        dailyReportCount={dailyCount}
      />
    </div>
  );
}
