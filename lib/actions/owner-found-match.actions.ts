"use server";

import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";

// ── OWNER APPROVE FOUND MATCH ─────────────────────────────────────────────────

export async function ownerApproveFoundMatch(
  foundMatchId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth();

    const match = await prisma.foundMatch.findUnique({
      where: { id: foundMatchId },
      include: {
        report: { select: { id: true, itemName: true, reporterId: true } },
      },
    });

    if (!match) return { success: false, error: "Found match tidak ditemukan." };
    if (match.status !== "PENDING")
      return { success: false, error: "Hanya found match PENDING yang dapat disetujui." };
    if (match.report.reporterId !== user.id)
      return { success: false, error: "Hanya pemilik barang yang dapat menyetujui." };

    await prisma.$transaction(async (tx) => {
      // Approve this match
      await tx.foundMatch.update({
        where: { id: foundMatchId },
        data: { status: "APPROVED", approvedAt: new Date() },
      });

      // Reject all other PENDING found matches for the same report
      const otherPendingMatches = await tx.foundMatch.findMany({
        where: {
          reportId: match.reportId,
          id: { not: foundMatchId },
          status: "PENDING",
        },
        select: { id: true, finderId: true },
      });

      await tx.foundMatch.updateMany({
        where: {
          reportId: match.reportId,
          id: { not: foundMatchId },
          status: "PENDING",
        },
        data: {
          status: "REJECTED",
          rejectionReason: "Pemilik barang telah menyetujui laporan penemuan lain.",
        },
      });

      // Notify rejected finders
      for (const rejected of otherPendingMatches) {
        await tx.notification.create({
          data: {
            userId: rejected.finderId,
            type: "FOUND_MATCH_REJECTED",
            message: `Laporan penemuan Anda untuk "${match.report.itemName}" ditolak. Alasan: Pemilik barang telah menyetujui laporan penemuan lain.`,
            data: { foundMatchId: rejected.id, reportId: match.reportId },
          },
        });
      }

      // Notify finder: serahkan barang ke Front Office
      await tx.notification.create({
        data: {
          userId: match.finderId,
          type: "FOUND_MATCH_APPROVED",
          message: `Pemilik barang menyetujui penemuan Anda untuk "${match.report.itemName}". Silakan serahkan barang ke Front Office.`,
          data: { foundMatchId: match.id, reportId: match.reportId },
        },
      });

      // Notify admins
      const admins = await tx.profile.findMany({
        where: { role: "ADMIN", status: "ACTIVE" },
        select: { id: true },
      });

      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            type: "FOUND_MATCH_APPROVED",
            message: `Pemilik barang menyetujui found match untuk "${match.report.itemName}". Menunggu penyerahan barang ke Front Office.`,
            data: { foundMatchId: match.id, reportId: match.reportId },
          },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          action: "FOUND_MATCH_APPROVED",
          actorId: user.id,
          targetType: "FoundMatch",
          targetId: foundMatchId,
          detail: `Pemilik barang menyetujui laporan penemuan untuk "${match.report.itemName}".`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("ownerApproveFoundMatch error:", err);
    return { success: false, error: "Gagal menyetujui laporan penemuan." };
  }
}

// ── OWNER REJECT FOUND MATCH ──────────────────────────────────────────────────

export async function ownerRejectFoundMatch(
  foundMatchId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth();

    if (!reason || reason.trim().length < 5) {
      return { success: false, error: "Alasan penolakan wajib diisi (minimal 5 karakter)." };
    }

    const match = await prisma.foundMatch.findUnique({
      where: { id: foundMatchId },
      include: {
        report: { select: { id: true, itemName: true, reporterId: true } },
      },
    });

    if (!match) return { success: false, error: "Found match tidak ditemukan." };
    if (match.status !== "PENDING")
      return { success: false, error: "Hanya found match PENDING yang dapat ditolak." };
    if (match.report.reporterId !== user.id)
      return { success: false, error: "Hanya pemilik barang yang dapat menolak." };

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
          message: `Pemilik barang menolak penemuan Anda untuk "${match.report.itemName}". Alasan: ${reason.trim()}`,
          data: { foundMatchId: match.id, reportId: match.reportId },
        },
      });

      // Audit
      await tx.auditLog.create({
        data: {
          action: "FOUND_MATCH_REJECTED",
          actorId: user.id,
          targetType: "FoundMatch",
          targetId: foundMatchId,
          detail: `Pemilik barang menolak laporan penemuan untuk "${match.report.itemName}". Alasan: ${reason.trim()}`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("ownerRejectFoundMatch error:", err);
    return { success: false, error: "Gagal menolak laporan penemuan." };
  }
}
