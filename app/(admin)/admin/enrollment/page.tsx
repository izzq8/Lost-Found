import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { KeyRound, ArrowLeft } from "lucide-react";
import EnrollmentClient from "./_components/enrollment-client";

export const metadata = { title: "Enrollment Code — LostFound SMKFN" };

export default async function AdminEnrollmentPage() {
  await requireAdmin();

  const codes = await prisma.enrollmentCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { name: true } },
    },
  });

  const serialized = codes.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type as string,
    status: c.status as string,
    usageCount: c.usageCount,
    creatorName: c.creator.name,
    expiredAt: c.expiredAt?.toISOString() || null,
    deactivatedAt: c.deactivatedAt?.toISOString() || null,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="flex items-center gap-1 text-orange-600 hover:underline w-fit text-sm font-medium"
      >
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </Link>

      <PageHero
        icon={KeyRound}
        title="Enrollment Code"
        subtitle="Kelola kode pendaftaran per tipe — Siswa dan Guru memiliki code terpisah"
      />

      <EnrollmentClient codes={serialized} />
    </div>
  );
}
