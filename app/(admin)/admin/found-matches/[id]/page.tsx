import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { SearchCheck, ArrowLeft } from "lucide-react";
import FoundMatchDetailClient from "./_components/found-match-detail-client";

export const metadata = { title: "Detail Found Match — LostFound SMKFN" };

export default async function AdminFoundMatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const match = await prisma.foundMatch.findUnique({
    where: { id },
    include: {
      finder: { select: { name: true, jabatan: true, email: true } },
      report: {
        select: {
          id: true,
          itemName: true,
          type: true,
          status: true,
          description: true,
          location: true,
          date: true,
          reporter: { select: { name: true, jabatan: true } },
          category: { select: { name: true, imageUrl: true } },
          images: { select: { url: true, fileName: true } },
        },
      },
      images: { select: { url: true, fileName: true } },
    },
  });

  if (!match) return notFound();

  const serialized = {
    id: match.id,
    status: match.status as string,
    description: match.description,
    rejectionReason: match.rejectionReason,
    adminNote: match.adminNote,
    createdAt: match.createdAt.toISOString(),
    approvedAt: match.approvedAt?.toISOString() ?? null,
    itemReceivedAt: match.itemReceivedAt?.toISOString() ?? null,
    completedAt: match.completedAt?.toISOString() ?? null,
    finder: {
      name: match.finder.name,
      jabatan: match.finder.jabatan as string,
      email: match.finder.email,
    },
    report: {
      id: match.report.id,
      itemName: match.report.itemName,
      description: match.report.description,
      location: match.report.location,
      date: match.report.date.toISOString(),
      status: match.report.status as string,
      reporterName: match.report.reporter.name,
      reporterJabatan: match.report.reporter.jabatan as string,
      categoryName: match.report.category.name,
      categoryImageUrl: match.report.category.imageUrl,
      images: match.report.images.map((img) => ({ url: img.url })),
    },
    images: match.images.map((img) => ({ url: img.url })),
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/found-matches" className="flex items-center gap-1 text-orange-600 hover:underline w-fit text-sm font-medium">
        <ArrowLeft size={16} /> Kembali ke Daftar Found Match
      </Link>

      <PageHero
        variant="compact"
        icon={SearchCheck}
        title={`Found Match — ${match.report.itemName}`}
        subtitle={`Oleh ${match.finder.name}`}
        badge={match.status}
      />

      <FoundMatchDetailClient match={serialized} />
    </div>
  );
}
