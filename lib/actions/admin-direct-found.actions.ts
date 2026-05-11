"use server";

import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";

/**
 * Admin directly marks a LOST item as found — skips PENDING/APPROVED stages.
 * Creates FoundMatch with status=ITEM_RECEIVED and updates report to AWAITING_PICKUP.
 */
export async function adminDirectFoundMatch(
  reportId: string,
  handoverPhotoUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, type: true, status: true, reporterId: true, itemName: true },
    });

    if (!report) return { success: false, error: "Laporan tidak ditemukan." };
    if (report.type !== "LOST") return { success: false, error: "Fitur ini hanya untuk barang hilang." };
    if (report.status !== "VERIFIED") return { success: false, error: "Laporan harus berstatus VERIFIED." };
    if (!handoverPhotoUrl) return { success: false, error: "Foto dokumentasi wajib diunggah." };

    await prisma.$transaction(async (tx) => {
      // Create FoundMatch directly at ITEM_RECEIVED (admin already has the item)
      const newMatch = await tx.foundMatch.create({
        data: {
          reportId: report.id,
          finderId: user.id,
          description: `Ditemukan oleh admin: ${profile.name}`,
          status: "ITEM_RECEIVED",
          approvedAt: new Date(),
          itemReceivedAt: new Date(),
          handoverPhotoUrl,
        },
      });

      // Update report to AWAITING_PICKUP
      await tx.report.update({
        where: { id: reportId },
        data: { status: "AWAITING_PICKUP" },
      });

      // Reject all PENDING found matches
      const pendingMatches = await tx.foundMatch.findMany({
        where: {
          reportId: report.id,
          id: { not: newMatch.id },
          status: "PENDING",
        },
        select: { id: true, finderId: true },
      });

      if (pendingMatches.length > 0) {
        await tx.foundMatch.updateMany({
          where: { id: { in: pendingMatches.map(m => m.id) } },
          data: {
            status: "REJECTED",
            rejectionReason: "Barang sudah ditemukan oleh pihak sekolah.",
          },
        });

        for (const fm of pendingMatches) {
          await tx.notification.create({
            data: {
              userId: fm.finderId,
              type: "FOUND_MATCH_REJECTED",
              message: `Laporan penemuan Anda untuk "${report.itemName}" ditolak. Barang sudah ditemukan oleh pihak sekolah.`,
              data: { foundMatchId: fm.id, reportId: report.id },
            },
          });
        }
      }

      // Notify owner
      await tx.notification.create({
        data: {
          userId: report.reporterId,
          type: "FOUND_MATCH_ITEM_RECEIVED",
          message: `Barang "${report.itemName}" Anda telah ditemukan oleh sekolah dan siap diambil di Front Office.`,
          data: { foundMatchId: newMatch.id, reportId: report.id },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          action: "FOUND_MATCH_ITEM_RECEIVED",
          actorId: user.id,
          targetType: "FoundMatch",
          targetId: newMatch.id,
          detail: `Admin '${profile.name}' menemukan barang "${report.itemName}" secara langsung.`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("adminDirectFoundMatch error:", err);
    return { success: false, error: "Gagal memproses. Silakan coba lagi." };
  }
}
