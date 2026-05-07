import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { notFound, redirect } from "next/navigation";
import EditReportFormClient from "@/app/(main)/dashboard/lost-items/[id]/edit/_components/edit-report-form-client";

export const metadata = { title: "Edit Laporan — LostFound SMKFN" };

export default async function EditFoundItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAuth();
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      category: true,
      images: true,
    },
  });

  if (!report || report.type !== "FOUND") return notFound();
  if (report.reporterId !== user.id) return redirect("/dashboard/found-items");

  if (!["PENDING", "VERIFIED"].includes(report.status)) {
    return redirect(`/dashboard/found-items/${id}`);
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const serialized = {
    id: report.id,
    type: report.type as "LOST" | "FOUND",
    status: report.status as string,
    itemName: report.itemName,
    categoryId: report.categoryId,
    description: report.description ?? "",
    location: report.location,
    date: report.date.toISOString().split("T")[0],
    time: report.time ?? "",
    images: report.images.map((img) => ({
      id: img.id,
      url: img.url,
      fileName: img.fileName,
    })),
  };

  return (
    <EditReportFormClient
      report={serialized}
      categories={categories}
      backHref={`/dashboard/found-items/${id}`}
    />
  );
}
