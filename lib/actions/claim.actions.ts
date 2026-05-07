"use server";

import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";
import {
  claimSchema,
  MAX_CLAIM_IMAGES,
  MAX_CLAIM_IMAGE_SIZE_BYTES,
  ALLOWED_CLAIM_IMAGE_TYPES,
} from "@/lib/validations/claim.schema";

// ── MAGIC BYTES VALIDATOR ─────────────────────────────────────────────────────
const IMAGE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

function validateMagicBytes(
  buffer: Buffer,
  mimeType: string
): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 8));
  const signatures = IMAGE_SIGNATURES[mimeType];
  if (!signatures) return false;
  return signatures.some((sig) =>
    sig.every((byte, idx) => bytes[idx] === byte)
  );
}

// ── UPLOAD HELPER ─────────────────────────────────────────────────────────────
async function uploadClaimImage(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<{ url: string; fileName: string } | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from("claim-images")
      .upload(fileName, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error.message);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("claim-images").getPublicUrl(data.path);

    return { url: publicUrl, fileName };
  } catch (err) {
    console.error("uploadClaimImage failed:", err);
    return null;
  }
}

// ── SERVER ACTION: SUBMIT CLAIM ───────────────────────────────────────────────

export type SubmitClaimState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  claimId?: string;
};

export async function submitClaim(
  formData: FormData
): Promise<SubmitClaimState> {
  let userId: string;
  try {
    const { user } = await requireAuth();
    userId = user.id;
  } catch {
    return { success: false, error: "Anda harus login untuk mengajukan klaim." };
  }

  const rawData = {
    reportId: formData.get("reportId") as string,
    description: formData.get("description") as string,
  };

  const parsed = claimSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0] as string;
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    });
    return { success: false, fieldErrors };
  }

  const validData = parsed.data;

  // Pastikan report ada, tipe FOUND, status VERIFIED, dan bukan milik sendiri
  const report = await prisma.report.findUnique({
    where: { id: validData.reportId },
    select: { id: true, type: true, status: true, reporterId: true, itemName: true },
  });

  if (!report) {
    return { success: false, error: "Laporan tidak ditemukan." };
  }
  if (report.type !== "FOUND") {
    return { success: false, error: "Klaim hanya dapat diajukan untuk barang temuan." };
  }
  if (report.status !== "VERIFIED") {
    return { success: false, error: "Barang temuan belum dipublikasikan/diverifikasi." };
  }
  if (report.reporterId === userId) {
    return { success: false, error: "Anda tidak dapat mengklaim barang yang Anda laporkan sendiri." };
  }

  // Anti-duplicate: Cek apa sudah punya klaim untuk report ini
  const existingClaim = await prisma.claim.findFirst({
    where: {
      reportId: validData.reportId,
      claimantId: userId,
      status: { in: ["PENDING", "APPROVED"] },
    },
  });

  if (existingClaim) {
    return { success: false, error: "Anda sudah memiliki pengajuan klaim aktif untuk barang ini." };
  }

  // Validasi & upload gambar — baca buffer SEKALI
  const imageFiles = formData.getAll("images") as File[];
  const validImages = imageFiles.filter((f) => f instanceof File && f.size > 0);

  if (validImages.length > MAX_CLAIM_IMAGES) {
    return { success: false, error: `Maksimal ${MAX_CLAIM_IMAGES} foto bukti.` };
  }

  const imageBuffers: { buffer: Buffer; name: string; type: string }[] = [];
  for (const file of validImages) {
    if (file.size > MAX_CLAIM_IMAGE_SIZE_BYTES) {
      return { success: false, error: `File "${file.name}" melebihi maksimal 5MB.` };
    }
    if (!ALLOWED_CLAIM_IMAGE_TYPES.includes(file.type)) {
      return { success: false, error: `Format "${file.name}" tidak didukung.` };
    }

    // Baca file ke buffer SEKALI
    const buf = Buffer.from(await file.arrayBuffer());

    if (!validateMagicBytes(buf, file.type)) {
      return { success: false, error: `File "${file.name}" tidak valid atau rusak.` };
    }

    imageBuffers.push({ buffer: buf, name: file.name, type: file.type });
  }

  // Upload gambar
  const uploadedImages: { url: string; fileName: string }[] = [];
  if (imageBuffers.length > 0) {
    const uploadResults = await Promise.all(
      imageBuffers.map((img) => {
        const ext = img.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const fileName = `${userId}/${Date.now()}-${nanoid(6)}.${ext}`;
        return uploadClaimImage(img.buffer, fileName, img.type);
      })
    );
    for (const result of uploadResults) {
      if (result) uploadedImages.push(result);
    }
  }

  try {
    const claim = await prisma.$transaction(async (tx) => {
      // Create Claim
      const newClaim = await tx.claim.create({
        data: {
          reportId: validData.reportId,
          claimantId: userId,
          description: validData.description,
          status: "PENDING",
          type: "ONLINE",
          images:
            uploadedImages.length > 0
              ? {
                  create: uploadedImages.map((img) => ({
                    url: img.url,
                    fileName: img.fileName,
                  })),
                }
              : undefined,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: "CLAIM_SUBMITTED",
          actorId: userId,
          targetType: "Claim",
          targetId: newClaim.id,
          detail: `User mengajukan klaim untuk barang: "${report.itemName}"`,
        },
      });

      // Dapatkan semua akun admin untuk Notifikasi
      const admins = await tx.profile.findMany({
        where: { role: "ADMIN", status: "ACTIVE" },
        select: { id: true },
      });

      // Kirim Notifikasi ke Admin
      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            type: "NEW_CLAIM",
            message: `Klaim baru diajukan untuk barang ditemukan: "${report.itemName}".`,
            data: { claimId: newClaim.id, reportId: report.id },
          },
        });
      }

      return newClaim;
    });

    return { success: true, claimId: claim.id };
  } catch (err: any) {
    // Rollback Gambar
    if (uploadedImages.length > 0) {
      await supabaseAdmin.storage
        .from("claim-images")
        .remove(uploadedImages.map((img) => img.fileName));
    }

    console.error("submitClaim error:", err);
    return { success: false, error: "Gagal mengajukan klaim. Silakan coba lagi." };
  }
}
