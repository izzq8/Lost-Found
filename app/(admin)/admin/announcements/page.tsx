import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { Megaphone } from "lucide-react";
import Link from "next/link";
import AnnouncementsClient from "./_components/announcements-client";

export const metadata = {
  title: "Manajemen Pengumuman — LostFound SMKFN",
};

export default async function AnnouncementsPage() {
  await requireAdmin();

  const announcements = await prisma.announcement.findMany({
    orderBy: { publishAt: "desc" },
    include: { creator: { select: { name: true } } },
  });

  const now = new Date();
  const serialized = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    imageUrl: a.imageUrl,
    publishAt: a.publishAt.toISOString(),
    expiredAt: a.expiredAt.toISOString(),
    creatorName: a.creator.name,
    status:
      now < a.publishAt
        ? ("scheduled" as const)
        : now > a.expiredAt
          ? ("expired" as const)
          : ("active" as const),
    createdAt: a.createdAt.toISOString(),
  }));

  const activeCount = serialized.filter((a) => a.status === "active").length;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="flex items-center gap-1 text-orange-600 hover:underline w-fit text-sm font-medium"
      >
        ← Kembali ke Dashboard
      </Link>

      <PageHero
        variant="default"
        icon={Megaphone}
        title="Manajemen Pengumuman"
        subtitle="Kelola pengumuman yang tampil di dashboard pengguna"
        badge={`${activeCount} aktif`}
      />

      <AnnouncementsClient announcements={serialized} />
    </div>
  );
}
