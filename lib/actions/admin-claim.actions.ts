"use server";

import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";

// ── APPROVE CLAIM ─────────────────────────────────────────────────────────────

export async function approveClaim(claimId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { report: { select: { id: true, itemName: true } } },
    });

    if (!claim) return { success: false, error: "Klaim tidak ditemukan." };
    if (claim.status !== "PENDING") return { success: false, error: "Hanya klaim PENDING yang dapat disetujui." };

    await prisma.$transaction(async (tx) => {
      await tx.claim.update({
        where: { id: claimId },
        data: { status: "APPROVED", approvedAt: new Date() },
      });

      // Query affected claims BEFORE rejecting — need claimantIds for notifications
      const otherPendingClaims = await tx.claim.findMany({
        where: {
          reportId: claim.reportId,
          id: { not: claimId },
          status: "PENDING",
        },
        select: { id: true, claimantId: true },
      });

      // Reject semua klaim lain untuk laporan yang sama
      await tx.claim.updateMany({
        where: {
          reportId: claim.reportId,
          id: { not: claimId },
          status: "PENDING",
        },
        data: {
          status: "REJECTED",
          rejectionReason: "Klaim lain untuk barang ini telah disetujui.",
        },
      });

      // Notify each auto-rejected claimant
      for (const rejected of otherPendingClaims) {
        await tx.notification.create({
          data: {
            userId: rejected.claimantId,
            type: "CLAIM_REJECTED",
            message: `Klaim Anda untuk "${claim.report.itemName}" ditolak. Alasan: Klaim lain untuk barang ini telah disetujui.`,
            data: { claimId: rejected.id, reportId: claim.reportId },
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: claim.claimantId,
          type: "CLAIM_APPROVED",
          message: `Klaim Anda untuk "${claim.report.itemName}" telah disetujui! Silakan ambil di Front Office.`,
          data: { claimId: claim.id, reportId: claim.reportId },
        },
      });

      await tx.auditLog.create({
        data: {
          action: "CLAIM_APPROVED",
          actorId: user.id,
          targetType: "Claim",
          targetId: claimId,
          detail: `Admin '${profile.name}' menyetujui klaim untuk "${claim.report.itemName}".`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("approveClaim error:", err);
    return { success: false, error: "Gagal menyetujui klaim." };
  }
}

// ── REJECT CLAIM ──────────────────────────────────────────────────────────────

export async function rejectClaim(claimId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    if (!reason || reason.trim().length < 5) {
      return { success: false, error: "Alasan penolakan wajib diisi (minimal 5 karakter)." };
    }

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { report: { select: { itemName: true } } },
    });

    if (!claim) return { success: false, error: "Klaim tidak ditemukan." };
    if (claim.status !== "PENDING") return { success: false, error: "Hanya klaim PENDING yang dapat ditolak." };

    await prisma.$transaction(async (tx) => {
      await tx.claim.update({
        where: { id: claimId },
        data: { status: "REJECTED", rejectionReason: reason.trim() },
      });

      await tx.notification.create({
        data: {
          userId: claim.claimantId,
          type: "CLAIM_REJECTED",
          message: `Klaim Anda untuk "${claim.report.itemName}" ditolak. Alasan: ${reason.trim()}`,
          data: { claimId: claim.id, reportId: claim.reportId },
        },
      });

      await tx.auditLog.create({
        data: {
          action: "CLAIM_REJECTED",
          actorId: user.id,
          targetType: "Claim",
          targetId: claimId,
          detail: `Admin '${profile.name}' menolak klaim untuk "${claim.report.itemName}". Alasan: ${reason.trim()}`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("rejectClaim error:", err);
    return { success: false, error: "Gagal menolak klaim." };
  }
}

// ── COMPLETE CLAIM (SERAH TERIMA) ─────────────────────────────────────────────

export async function completeClaim(claimId: string, handoverPhotoUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    if (!handoverPhotoUrl) {
      return { success: false, error: "Foto serah terima barang wajib diunggah." };
    }

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { report: { select: { id: true, itemName: true, reporterId: true } } },
    });

    if (!claim) return { success: false, error: "Klaim tidak ditemukan." };
    if (claim.status !== "APPROVED") return { success: false, error: "Hanya klaim APPROVED yang dapat diselesaikan." };

    await prisma.$transaction(async (tx) => {
      // Set claim COMPLETED
      await tx.claim.update({
        where: { id: claimId },
        data: { status: "COMPLETED", completedAt: new Date(), handoverPhotoUrl },
      });

      // Set report CLAIMED
      await tx.report.update({
        where: { id: claim.reportId },
        data: { status: "CLAIMED" },
      });

      // Notif ke pengklaim
      await tx.notification.create({
        data: {
          userId: claim.claimantId,
          type: "CLAIM_COMPLETED",
          message: `Serah terima "${claim.report.itemName}" telah selesai. Terima kasih!`,
          data: { claimId: claim.id, reportId: claim.reportId },
        },
      });

      // Notif ke pelapor
      await tx.notification.create({
        data: {
          userId: claim.report.reporterId,
          type: "REPORT_CLAIMED",
          message: `Barang "${claim.report.itemName}" telah diserahkan ke pemiliknya.`,
          data: { reportId: claim.reportId },
        },
      });

      await tx.auditLog.create({
        data: {
          action: "CLAIM_COMPLETED",
          actorId: user.id,
          targetType: "Claim",
          targetId: claimId,
          detail: `Admin '${profile.name}' menyelesaikan serah terima "${claim.report.itemName}".`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("completeClaim error:", err);
    return { success: false, error: "Gagal menyelesaikan serah terima." };
  }
}

// ── CREATE MANUAL CLAIM (OFFLINE / TAMU) ──────────────────────────────────────

export async function createManualClaim(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    const reportId = formData.get("reportId") as string;
    const claimantType = formData.get("claimantType") as string; // "registered" or "guest"
    const claimantId = formData.get("claimantId") as string | null;
    const guestName = (formData.get("guestName") as string)?.trim();
    const guestPhone = (formData.get("guestPhone") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const directHandover = formData.get("directHandover") === "true";

    // Validation
    if (!reportId) return { success: false, error: "Laporan wajib dipilih." };
    if (!description || description.length < 5) {
      return { success: false, error: "Deskripsi/catatan verifikasi minimal 5 karakter." };
    }

    if (claimantType === "registered" && !claimantId) {
      return { success: false, error: "Pilih user pengambil." };
    }
    if (claimantType === "guest") {
      if (!guestName || guestName.length < 2) {
        return { success: false, error: "Nama tamu wajib diisi (minimal 2 karakter)." };
      }
      if (!guestPhone || guestPhone.length < 8) {
        return { success: false, error: "No. HP tamu wajib diisi (minimal 8 digit)." };
      }
    }

    // Verify report exists and is VERIFIED
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, itemName: true, reporterId: true, status: true },
    });
    if (!report) return { success: false, error: "Laporan tidak ditemukan." };
    if (report.status !== "VERIFIED") {
      return { success: false, error: "Hanya laporan berstatus VERIFIED yang dapat diklaim." };
    }

    const isGuest = claimantType === "guest";
    const actualClaimantId = isGuest ? user.id : (claimantId || user.id);

    await prisma.$transaction(async (tx) => {
      // Create claim with OFFLINE type
      const newClaim = await tx.claim.create({
        data: {
          reportId,
          claimantId: actualClaimantId,
          type: "OFFLINE",
          status: directHandover ? "COMPLETED" : "APPROVED",
          description,
          adminNote: `Klaim manual oleh admin ${profile.name}`,
          isGuest,
          guestName: isGuest ? guestName : null,
          guestPhone: isGuest ? guestPhone : null,
          approvedAt: new Date(),
          completedAt: directHandover ? new Date() : null,
        },
      });

      // If direct handover, mark report as CLAIMED
      if (directHandover) {
        await tx.report.update({
          where: { id: reportId },
          data: { status: "CLAIMED" },
        });
      }

      // Reject other pending claims for this report
      await tx.claim.updateMany({
        where: {
          reportId,
          id: { not: newClaim.id },
          status: "PENDING",
        },
        data: {
          status: "REJECTED",
          rejectionReason: "Barang telah diklaim secara manual oleh admin.",
        },
      });

      // Notification to reporter
      await tx.notification.create({
        data: {
          userId: report.reporterId,
          type: directHandover ? "CLAIM_COMPLETED" : "CLAIM_APPROVED",
          message: directHandover
            ? `Barang "${report.itemName}" telah diserahkan ke ${isGuest ? `tamu (${guestName})` : "pemiliknya"} melalui klaim manual.`
            : `Klaim manual untuk "${report.itemName}" telah dibuat dan disetujui.`,
          data: { claimId: newClaim.id, reportId },
        },
      });

      // Notification to registered claimant (non-guest)
      if (!isGuest && actualClaimantId !== report.reporterId) {
        await tx.notification.create({
          data: {
            userId: actualClaimantId,
            type: directHandover ? "CLAIM_COMPLETED" : "CLAIM_APPROVED",
            message: directHandover
              ? `Serah terima "${report.itemName}" telah selesai.`
              : `Klaim Anda untuk "${report.itemName}" telah disetujui. Silakan ambil di Front Office.`,
            data: { claimId: newClaim.id, reportId },
          },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          action: directHandover ? "CLAIM_COMPLETED" : "CLAIM_APPROVED",
          actorId: user.id,
          targetType: "Claim",
          targetId: newClaim.id,
          detail: `Admin '${profile.name}' membuat klaim manual untuk "${report.itemName}" — ${isGuest ? `Tamu: ${guestName} (${guestPhone})` : `User: ${actualClaimantId}`}${directHandover ? " — Serah terima langsung" : ""}`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("createManualClaim error:", err);
    return { success: false, error: "Gagal membuat klaim manual." };
  }
}

