"use server";

import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";
import {
  foundMatchSchema,
  MAX_FOUND_MATCH_IMAGES,
  MAX_FOUND_MATCH_IMAGE_SIZE_BYTES,
  ALLOWED_FOUND_MATCH_IMAGE_TYPES,
} from "@/lib/validations/found-match.schema";

// ── MAGIC BYTES VALIDATION ────────────────────────────────────────────────────

const IMAGE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 8));
  const signatures = IMAGE_SIGNATURES[mimeType];
  if (!signatures) return false;
  return signatures.some((sig) =>
    sig.every((byte, idx) => bytes[idx] === byte)
  );
}

// ── UPLOAD HELPER ─────────────────────────────────────────────────────────────

async function uploadFoundMatchImage(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<{ url: string; fileName: string } | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from("found-match-images")
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
    } = supabaseAdmin.storage.from("found-match-images").getPublicUrl(data.path);

    return { url: publicUrl, fileName };
  } catch (err) {
    console.error("uploadFoundMatchImage failed:", err);
    return null;
  }
}

// ── SERVER ACTION: SUBMIT FOUND MATCH ─────────────────────────────────────────

export type SubmitFoundMatchState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  foundMatchId?: string;
};

export async function submitFoundMatch(
  formData: FormData
): Promise<SubmitFoundMatchState> {
  let userId: string;
  try {
    const { user } = await requireAuth();
    userId = user.id;
  } catch {
    return { success: false, error: "Anda harus login." };
  }

  // 1. Validate input
  const rawData = {
    reportId: formData.get("reportId") as string,
    description: formData.get("description") as string,
  };

  const parsed = foundMatchSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0] as string;
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    });
    return { success: false, fieldErrors };
  }

  const validData = parsed.data;

  // 2. Check report exists, type=LOST, status=VERIFIED
  const report = await prisma.report.findUnique({
    where: { id: validData.reportId },
    select: { id: true, type: true, status: true, reporterId: true, itemName: true },
  });

  if (!report) {
    return { success: false, error: "Laporan tidak ditemukan." };
  }
  if (report.type !== "LOST") {
    return { success: false, error: "Fitur ini hanya untuk barang hilang." };
  }
  if (report.status !== "VERIFIED") {
    return { success: false, error: "Laporan belum diverifikasi atau sudah tidak aktif." };
  }

  // 3. Check user bukan pelapor sendiri
  if (report.reporterId === userId) {
    return { success: false, error: "Anda tidak dapat melaporkan penemuan barang Anda sendiri." };
  }

  // 4. Anti-duplicate: user belum punya FoundMatch aktif untuk report ini
  const existingMatch = await prisma.foundMatch.findFirst({
    where: {
      reportId: validData.reportId,
      finderId: userId,
      status: { in: ["PENDING", "APPROVED", "ITEM_RECEIVED"] },
    },
  });

  if (existingMatch) {
    return { success: false, error: "Anda sudah memiliki laporan penemuan aktif untuk barang ini." };
  }

  // 5. Check kalau sudah ada FoundMatch APPROVED/ITEM_RECEIVED untuk report ini
  const activeMatch = await prisma.foundMatch.findFirst({
    where: {
      reportId: validData.reportId,
      status: { in: ["APPROVED", "ITEM_RECEIVED"] },
    },
  });

  if (activeMatch) {
    return { success: false, error: "Barang ini sudah dalam proses pengembalian oleh orang lain." };
  }

  // 6. Validate & upload images — single-buffer pattern
  const imageFiles = formData.getAll("images") as File[];
  const validImages = imageFiles.filter((f) => f instanceof File && f.size > 0);

  if (validImages.length > MAX_FOUND_MATCH_IMAGES) {
    return { success: false, error: `Maksimal ${MAX_FOUND_MATCH_IMAGES} foto bukti.` };
  }

  const imageBuffers: { buffer: Buffer; name: string; type: string }[] = [];
  for (const file of validImages) {
    if (file.size > MAX_FOUND_MATCH_IMAGE_SIZE_BYTES) {
      return { success: false, error: `File "${file.name}" melebihi maksimal 5MB.` };
    }
    if (!ALLOWED_FOUND_MATCH_IMAGE_TYPES.includes(file.type)) {
      return { success: false, error: `Format "${file.name}" tidak didukung.` };
    }

    const buf = Buffer.from(await file.arrayBuffer());

    if (!validateMagicBytes(buf, file.type)) {
      return { success: false, error: `File "${file.name}" tidak valid atau rusak.` };
    }

    imageBuffers.push({ buffer: buf, name: file.name, type: file.type });
  }

  // Upload images
  const uploadedImages: { url: string; fileName: string }[] = [];
  if (imageBuffers.length > 0) {
    const uploadResults = await Promise.all(
      imageBuffers.map((img) => {
        const ext = img.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const fileName = `${userId}/${Date.now()}-${nanoid(6)}.${ext}`;
        return uploadFoundMatchImage(img.buffer, fileName, img.type);
      })
    );
    for (const result of uploadResults) {
      if (result) uploadedImages.push(result);
    }
  }

  // 7. Create FoundMatch in transaction
  try {
    const foundMatch = await prisma.$transaction(async (tx) => {
      const newMatch = await tx.foundMatch.create({
        data: {
          reportId: validData.reportId,
          finderId: userId,
          description: validData.description,
          status: "PENDING",
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

      // Notify all admins
      const admins = await tx.profile.findMany({
        where: { role: "ADMIN", status: "ACTIVE" },
        select: { id: true },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "FOUND_MATCH_SUBMITTED",
            message: `Ada yang menemukan barang "${report.itemName}". Menunggu verifikasi.`,
            data: { foundMatchId: newMatch.id, reportId: validData.reportId },
          })),
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          action: "FOUND_MATCH_SUBMITTED",
          actorId: userId,
          targetType: "FoundMatch",
          targetId: newMatch.id,
          detail: `User melaporkan penemuan untuk barang "${report.itemName}"`,
        },
      });

      return newMatch;
    });

    return { success: true, foundMatchId: foundMatch.id };
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;

    // Rollback uploaded images on failure
    if (uploadedImages.length > 0) {
      await supabaseAdmin.storage
        .from("found-match-images")
        .remove(uploadedImages.map((img) => img.fileName));
    }

    console.error("submitFoundMatch error:", err);
    return { success: false, error: "Terjadi kesalahan pada server. Silakan coba lagi." };
  }
}
