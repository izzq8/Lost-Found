"use server";

import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";

// ── APPROVE FOUND MATCH ───────────────────────────────────────────────────────

export async function approveFoundMatch(
  foundMatchId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    const match = await prisma.foundMatch.findUnique({
      where: { id: foundMatchId },
      include: {
        report: { select: { id: true, itemName: true, reporterId: true } },
      },
    });

    if (!match) return { success: false, error: "Found match tidak ditemukan." };
    if (match.status !== "PENDING")
      return { success: false, error: "Hanya found match PENDING yang dapat disetujui." };

    await prisma.$transaction(async (tx) => {
      // Update this match to APPROVED
      await tx.foundMatch.update({
        where: { id: foundMatchId },
        data: { status: "APPROVED", approvedAt: new Date() },
      });

      // Query other PENDING found matches before rejecting them (for notifications)
      const otherPendingMatches = await tx.foundMatch.findMany({
        where: {
          reportId: match.reportId,
          id: { not: foundMatchId },
          status: "PENDING",
        },
        select: { id: true, finderId: true },
      });

      // Reject all other PENDING found matches for the same report
      await tx.foundMatch.updateMany({
        where: {
          reportId: match.reportId,
          id: { not: foundMatchId },
          status: "PENDING",
        },
        data: {
          status: "REJECTED",
          rejectionReason: "Laporan penemuan lain untuk barang ini telah disetujui.",
        },
      });

      // Notify each auto-rejected finder
      for (const rejected of otherPendingMatches) {
        await tx.notification.create({
          data: {
            userId: rejected.finderId,
            type: "FOUND_MATCH_REJECTED",
            message: `Laporan penemuan Anda untuk "${match.report.itemName}" ditolak. Alasan: Laporan penemuan lain telah disetujui.`,
            data: { foundMatchId: rejected.id, reportId: match.reportId },
          },
        });
      }

      // Notify finder: serahkan barang ke front office
      await tx.notification.create({
        data: {
          userId: match.finderId,
          type: "FOUND_MATCH_APPROVED",
          message: `Laporan penemuan Anda untuk "${match.report.itemName}" disetujui. Silakan serahkan barang ke Front Office.`,
          data: { foundMatchId: match.id, reportId: match.reportId },
        },
      });

      // Notify owner: barang ditemukan
      await tx.notification.create({
        data: {
          userId: match.report.reporterId,
          type: "FOUND_MATCH_APPROVED",
          message: `Kabar baik! Barang "${match.report.itemName}" Anda telah ditemukan oleh seseorang.`,
          data: { foundMatchId: match.id, reportId: match.reportId },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          action: "FOUND_MATCH_APPROVED",
          actorId: user.id,
          targetType: "FoundMatch",
          targetId: foundMatchId,
          detail: `Admin '${profile.name}' menyetujui laporan penemuan untuk "${match.report.itemName}".`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("approveFoundMatch error:", err);
    return { success: false, error: "Gagal menyetujui laporan penemuan." };
  }
}

// ── REJECT FOUND MATCH ────────────────────────────────────────────────────────

export async function rejectFoundMatch(
  foundMatchId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    if (!reason || reason.trim().length < 5) {
      return { success: false, error: "Alasan penolakan wajib diisi (minimal 5 karakter)." };
    }

    const match = await prisma.foundMatch.findUnique({
      where: { id: foundMatchId },
      include: {
        report: { select: { itemName: true } },
      },
    });

    if (!match) return { success: false, error: "Found match tidak ditemukan." };
    if (match.status !== "PENDING")
      return { success: false, error: "Hanya found match PENDING yang dapat ditolak." };

    await prisma.$transaction(async (tx) => {
      await tx.foundMatch.update({
        where: { id: foundMatchId },
        data: { status: "REJECTED", rejectionReason: reason.trim() },
      });

      // Notify finder
      await tx.notification.create({
        data: {
          userId: match.finderId,
          type: "FOUND_MATCH_REJECTED",
          message: `Laporan penemuan Anda untuk "${match.report.itemName}" ditolak. Alasan: ${reason.trim()}`,
          data: { foundMatchId: match.id, reportId: match.reportId },
        },
      });

      await tx.auditLog.create({
        data: {
          action: "FOUND_MATCH_REJECTED",
          actorId: user.id,
          targetType: "FoundMatch",
          targetId: foundMatchId,
          detail: `Admin '${profile.name}' menolak laporan penemuan untuk "${match.report.itemName}". Alasan: ${reason.trim()}`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("rejectFoundMatch error:", err);
    return { success: false, error: "Gagal menolak laporan penemuan." };
  }
}

// ── CONFIRM ITEM RECEIVED ─────────────────────────────────────────────────────

export async function confirmItemReceived(
  foundMatchId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    const match = await prisma.foundMatch.findUnique({
      where: { id: foundMatchId },
      include: {
        report: { select: { id: true, itemName: true, reporterId: true } },
      },
    });

    if (!match) return { success: false, error: "Found match tidak ditemukan." };
    if (match.status !== "APPROVED")
      return { success: false, error: "Hanya found match APPROVED yang dapat dikonfirmasi." };

    await prisma.$transaction(async (tx) => {
      // Update found match
      await tx.foundMatch.update({
        where: { id: foundMatchId },
        data: { status: "ITEM_RECEIVED", itemReceivedAt: new Date() },
      });

      // Update report to AWAITING_PICKUP
      await tx.report.update({
        where: { id: match.reportId },
        data: { status: "AWAITING_PICKUP" },
      });

      // Notify owner: barang siap diambil
      await tx.notification.create({
        data: {
          userId: match.report.reporterId,
          type: "FOUND_MATCH_ITEM_RECEIVED",
          message: `Barang "${match.report.itemName}" Anda siap diambil di Front Office.`,
          data: { foundMatchId: match.id, reportId: match.reportId },
        },
      });

      // Notify finder: terima kasih
      await tx.notification.create({
        data: {
          userId: match.finderId,
          type: "FOUND_MATCH_ITEM_RECEIVED",
          message: `Terima kasih! Barang "${match.report.itemName}" telah diterima oleh admin.`,
          data: { foundMatchId: match.id, reportId: match.reportId },
        },
      });

      await tx.auditLog.create({
        data: {
          action: "FOUND_MATCH_ITEM_RECEIVED",
          actorId: user.id,
          targetType: "FoundMatch",
          targetId: foundMatchId,
          detail: `Admin '${profile.name}' mengonfirmasi penerimaan barang "${match.report.itemName}".`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("confirmItemReceived error:", err);
    return { success: false, error: "Gagal mengonfirmasi penerimaan barang." };
  }
}

// ── COMPLETE FOUND MATCH ──────────────────────────────────────────────────────

export async function completeFoundMatch(
  foundMatchId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    const match = await prisma.foundMatch.findUnique({
      where: { id: foundMatchId },
      include: {
        report: { select: { id: true, itemName: true, reporterId: true } },
      },
    });

    if (!match) return { success: false, error: "Found match tidak ditemukan." };
    if (match.status !== "ITEM_RECEIVED")
      return { success: false, error: "Hanya found match ITEM_RECEIVED yang dapat diselesaikan." };

    await prisma.$transaction(async (tx) => {
      // Complete found match
      await tx.foundMatch.update({
        where: { id: foundMatchId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      // Update report to CLAIMED
      await tx.report.update({
        where: { id: match.reportId },
        data: { status: "CLAIMED" },
      });

      // Notify owner
      await tx.notification.create({
        data: {
          userId: match.report.reporterId,
          type: "FOUND_MATCH_COMPLETED",
          message: `Serah terima "${match.report.itemName}" telah selesai. Terima kasih!`,
          data: { foundMatchId: match.id, reportId: match.reportId },
        },
      });

      // Notify finder
      await tx.notification.create({
        data: {
          userId: match.finderId,
          type: "FOUND_MATCH_COMPLETED",
          message: `Barang "${match.report.itemName}" telah diserahkan ke pemiliknya. Terima kasih atas bantuan Anda!`,
          data: { foundMatchId: match.id, reportId: match.reportId },
        },
      });

      await tx.auditLog.create({
        data: {
          action: "FOUND_MATCH_COMPLETED",
          actorId: user.id,
          targetType: "FoundMatch",
          targetId: foundMatchId,
          detail: `Admin '${profile.name}' menyelesaikan serah terima "${match.report.itemName}".`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("completeFoundMatch error:", err);
    return { success: false, error: "Gagal menyelesaikan serah terima." };
  }
}

// ── REVOKE FOUND MATCH (Recovery) ─────────────────────────────────────────────

export async function revokeFoundMatch(
  foundMatchId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    if (!reason || reason.trim().length < 5) {
      return { success: false, error: "Alasan revoke wajib diisi (minimal 5 karakter)." };
    }

    const match = await prisma.foundMatch.findUnique({
      where: { id: foundMatchId },
      include: {
        report: { select: { id: true, itemName: true, reporterId: true, status: true } },
      },
    });

    if (!match) return { success: false, error: "Found match tidak ditemukan." };
    if (match.status !== "APPROVED") {
      return { success: false, error: "Hanya found match APPROVED yang dapat di-revoke." };
    }

    await prisma.$transaction(async (tx) => {
      // Reject the match
      await tx.foundMatch.update({
        where: { id: foundMatchId },
        data: { status: "REJECTED", rejectionReason: reason.trim() },
      });

      // Revert report to VERIFIED
      await tx.report.update({
        where: { id: match.reportId },
        data: { status: "VERIFIED" },
      });

      // Notify finder
      await tx.notification.create({
        data: {
          userId: match.finderId,
          type: "FOUND_MATCH_REJECTED",
          message: `Laporan penemuan Anda untuk "${match.report.itemName}" dibatalkan oleh admin. Alasan: ${reason.trim()}`,
          data: { foundMatchId: match.id, reportId: match.reportId },
        },
      });

      // Notify owner
      await tx.notification.create({
        data: {
          userId: match.report.reporterId,
          type: "FOUND_MATCH_REJECTED",
          message: `Penemuan barang "${match.report.itemName}" dibatalkan. Laporan kembali aktif untuk pencarian.`,
          data: { reportId: match.reportId },
        },
      });

      // Cascade: revert auto-rejected found-matches back to PENDING
      const autoRejectedMatches = await tx.foundMatch.findMany({
        where: {
          reportId: match.reportId,
          id: { not: foundMatchId },
          status: "REJECTED",
          rejectionReason: "Laporan penemuan lain untuk barang ini telah disetujui.",
        },
        select: { id: true, finderId: true },
      });

      if (autoRejectedMatches.length > 0) {
        await tx.foundMatch.updateMany({
          where: { id: { in: autoRejectedMatches.map(m => m.id) } },
          data: { status: "PENDING", rejectionReason: null },
        });

        // Notify each cascaded finder
        for (const fm of autoRejectedMatches) {
          await tx.notification.create({
            data: {
              userId: fm.finderId,
              type: "FOUND_MATCH_PENDING",
              message: `Laporan penemuan Anda untuk "${match.report.itemName}" kembali aktif dan menunggu review admin.`,
              data: { reportId: match.reportId },
            },
          });
        }
      }

      // Audit
      await tx.auditLog.create({
        data: {
          action: "FOUND_MATCH_REVOKED",
          actorId: user.id,
          targetType: "FoundMatch",
          targetId: foundMatchId,
          detail: `Admin '${profile.name}' me-revoke found match untuk "${match.report.itemName}". Alasan: ${reason.trim()}`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("revokeFoundMatch error:", err);
    return { success: false, error: "Gagal me-revoke laporan penemuan." };
  }
}
