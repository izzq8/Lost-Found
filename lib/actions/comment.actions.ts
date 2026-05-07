"use server";

import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { commentSchema } from "@/lib/validations/comment.schema";

export async function createComment(
  formData: FormData
): Promise<{ success: boolean; error?: string; fieldErrors?: any }> {
  try {
    const { user, profile } = await requireAuth();

    const rawData = {
      content: formData.get("content") as string,
      reportId: (formData.get("reportId") as string) || undefined,
      claimId: (formData.get("claimId") as string) || undefined,
    };

    const parsed = commentSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const { content, reportId, claimId } = parsed.data;

    let targetName = "";

    // Validate target exists (report or claim)
    if (reportId) {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        select: { reporterId: true, itemName: true },
      });
      if (!report) return { success: false, error: "Laporan tidak ditemukan." };
      targetName = report.itemName;
    } else if (claimId) {
      const claim = await prisma.claim.findUnique({
        where: { id: claimId },
        select: { claimantId: true, report: { select: { itemName: true } } },
      });
      if (!claim) return { success: false, error: "Klaim tidak ditemukan." };
      targetName = claim.report.itemName;
    } else {
      return { success: false, error: "Identitas target tidak valid." };
    }

    await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          content,
          authorId: user.id,
          reportId: reportId || null,
          claimId: claimId || null,
        },
      });

      // Notify admins when a user comments
      if (profile.role === "USER") {
        const admins = await tx.profile.findMany({
          where: { role: "ADMIN", status: "ACTIVE" },
          select: { id: true },
        });

        for (const admin of admins) {
          await tx.notification.create({
            data: {
              userId: admin.id,
              type: "NEW_COMMENT",
              message: `User '${profile.name}' mengomentari ${reportId ? "laporan" : "klaim"} "${targetName}".`,
              data: { reportId, claimId },
            },
          });
        }
      }

      // Notify relevant parties when admin comments
      if (profile.role === "ADMIN") {
        // Notify report owner if commenting on a report
        if (reportId) {
          const report = await tx.report.findUnique({
            where: { id: reportId },
            select: { reporterId: true },
          });
          if (report && report.reporterId !== user.id) {
            await tx.notification.create({
              data: {
                userId: report.reporterId,
                type: "NEW_COMMENT",
                message: `Admin mengomentari laporan Anda untuk "${targetName}".`,
                data: { reportId },
              },
            });
          }
        }
        // Notify claim owner if commenting on a claim
        if (claimId) {
          const claim = await tx.claim.findUnique({
            where: { id: claimId },
            select: { claimantId: true },
          });
          if (claim && claim.claimantId !== user.id) {
            await tx.notification.create({
              data: {
                userId: claim.claimantId,
                type: "NEW_COMMENT",
                message: `Admin mengomentari klaim Anda untuk "${targetName}".`,
                data: { claimId },
              },
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          action: "COMMENT_CREATED",
          actorId: user.id,
          targetType: "Comment",
          targetId: newComment.id,
          detail: `User '${profile.name}' membuat komentar pada ${reportId ? "laporan" : "klaim"} "${targetName}"`,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("createComment error:", error);
    return { success: false, error: "Gagal memposting komentar." };
  }
}

export async function deleteComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAuth();

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) return { success: false, error: "Komentar tidak ditemukan." };

    // Yang bisa hapus: Pembuat komentar, ATAU Admin
    if (comment.authorId !== user.id && profile.role !== "ADMIN") {
      return { success: false, error: "Akses ditolak." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id: commentId } });

      await tx.auditLog.create({
        data: {
          action: "COMMENT_DELETED",
          actorId: user.id,
          targetType: "Comment",
          targetId: commentId,
          detail: `Komentar dihapus oleh '${profile.name}'.`,
        },
      });
    });

    return { success: true };
  } catch (err) {
    console.error("deleteComment error:", err);
    return { success: false, error: "Gagal menghapus komentar." };
  }
}
