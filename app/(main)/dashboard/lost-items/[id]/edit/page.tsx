import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { notFound, redirect } from "next/navigation";
import EditReportFormClient from "./_components/edit-report-form-client";

export const metadata = { title: "Edit Laporan — LostFound SMKFN" };

export default async function EditLostItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAuth();
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      category: true,
      images: true,
    },
  });

  if (!report || report.type !== "LOST") return notFound();
  if (report.reporterId !== user.id) return redirect("/dashboard/lost-items");

  // Only PENDING and VERIFIED can be edited
  if (!["PENDING", "VERIFIED"].includes(report.status)) {
    return redirect(`/dashboard/lost-items/${id}`);
  }

  // Block edit if VERIFIED with active FoundMatch
  if (report.status === "VERIFIED") {
    const activeFoundMatch = await prisma.foundMatch.findFirst({
      where: {
        reportId: id,
        status: { in: ["PENDING", "APPROVED", "ITEM_RECEIVED"] },
      },
    });
    if (activeFoundMatch) return redirect(`/dashboard/lost-items/${id}`);
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
      backHref={`/dashboard/lost-items/${id}`}
    />
  );
}
