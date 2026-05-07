"use server";

import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";

export async function deactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile: adminProfile } = await requireAdmin();

    if (userId === user.id) {
      return { success: false, error: "Anda tidak dapat menonaktifkan akun Anda sendiri." };
    }

    const target = await prisma.profile.findUnique({ where: { id: userId } });
    if (!target) return { success: false, error: "User tidak ditemukan." };
    if (target.status === "DEACTIVATED") return { success: false, error: "User sudah nonaktif." };

    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: userId },
        data: { status: "DEACTIVATED" },
      });

      await tx.auditLog.create({
        data: {
          action: "USER_DEACTIVATED",
          actorId: user.id,
          targetType: "User",
          targetId: userId,
          detail: `Admin '${adminProfile.name}' menonaktifkan user '${target.name}'.`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("deactivateUser error:", err);
    return { success: false, error: "Gagal menonaktifkan user." };
  }
}

export async function reactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile: adminProfile } = await requireAdmin();

    const target = await prisma.profile.findUnique({ where: { id: userId } });
    if (!target) return { success: false, error: "User tidak ditemukan." };
    if (target.status === "ACTIVE") return { success: false, error: "User sudah aktif." };

    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: userId },
        data: { status: "ACTIVE" },
      });

      await tx.auditLog.create({
        data: {
          action: "USER_REACTIVATED",
          actorId: user.id,
          targetType: "User",
          targetId: userId,
          detail: `Admin '${adminProfile.name}' mengaktifkan kembali user '${target.name}'.`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("reactivateUser error:", err);
    return { success: false, error: "Gagal mengaktifkan user." };
  }
}
