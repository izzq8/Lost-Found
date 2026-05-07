"use server";

import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { revalidatePath } from "next/cache";

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const { user } = await requireAuth();
    return await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });
  } catch {
    return 0;
  }
}

export async function getRecentNotifications(limit = 5) {
  try {
    const { user } = await requireAuth();
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return notifications.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      data: n.data as Record<string, string> | null,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function getAllNotifications() {
  try {
    const { user } = await requireAuth();
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return notifications.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      data: n.data as Record<string, string> | null,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(id: string): Promise<{ success: boolean }> {
  try {
    const { user } = await requireAuth();
    
    // Pastikan notifikasi milik user
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== user.id) return { success: false };

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    
    return { success: true };
  } catch (error) {
    console.error("markNotificationAsRead error:", error);
    return { success: false };
  }
}

export async function markAllNotificationsAsRead(pathname: string): Promise<{ success: boolean }> {
  try {
    const { user } = await requireAuth();
    
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    // Revalidate the path so the layout refetches the count
    revalidatePath(pathname);
    return { success: true };
  } catch (error) {
    console.error("markAllNotificationsAsRead error:", error);
    return { success: false };
  }
}
