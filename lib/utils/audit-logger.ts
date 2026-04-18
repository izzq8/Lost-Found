import { prisma } from "@/lib/prisma/client";

/**
 * Catat aksi penting dalam audit trail.
 * actorId bisa null untuk aksi sistem (contoh: REPORT_EXPIRED oleh cron job).
 */
export async function logAudit({
  action,
  actorId,
  targetType,
  targetId,
  detail,
}: {
  action: string;
  actorId?: string | null;
  targetType: string;
  targetId?: string | null;
  detail: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId: actorId ?? null,
        targetType,
        targetId: targetId ?? null,
        detail,
      },
    });
  } catch (error) {
    // Jangan sampai audit log error mengganggu flow utama
    console.error("[AuditLog] Gagal mencatat log:", error);
  }
}
