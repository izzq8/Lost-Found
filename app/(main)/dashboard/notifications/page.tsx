import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { BackButton } from "@/components/shared/back-button";
import { Bell } from "lucide-react";
import NotificationsClient from "./_components/notifications-client";

export const metadata = {
  title: "Notifikasi — LostFound SMKFN",
};

export default async function NotificationsPage() {
  const { user } = await requireAuth();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    data: n.data as Record<string, string> | null,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));

  const unreadCount = serialized.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col gap-6">
      <BackButton
        fallbackHref="/dashboard"
        fallbackLabel="Kembali ke Dashboard"
      />
      <PageHero
        variant="default"
        icon={Bell}
        title="Notifikasi"
        subtitle="Riwayat semua notifikasi Anda"
        badge={unreadCount > 0 ? `${unreadCount} belum dibaca` : undefined}
      />
      <NotificationsClient notifications={serialized} />
    </div>
  );
}
