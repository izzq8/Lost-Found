"use server";

import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import {
  guestReportSchema,
  MAX_IMAGES,
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/validations/report.schema";
import { AUDIT_ACTIONS } from "@/lib/utils/constants";

// ── Magic Bytes Validator ─────────────────────────────────────────────────────
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

// ── Upload Helper ─────────────────────────────────────────────────────────────
async function uploadReportImage(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<{ url: string; fileName: string } | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from("report-images")
      .upload(fileName, buffer, { contentType, upsert: false });

    if (error) {
      console.error("Storage upload error:", error.message);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("report-images").getPublicUrl(data.path);

    return { url: publicUrl, fileName };
  } catch (err) {
    console.error("uploadReportImage failed:", err);
    return null;
  }
}

// ── SERVER ACTION: CREATE GUEST REPORT ────────────────────────────────────────
export type GuestReportState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  reportId?: string;
};

export async function createGuestReport(
  formData: FormData
): Promise<GuestReportState> {
  // 1. Admin-only guard
  let adminId: string;
  let adminName: string;
  try {
    const { user, profile } = await requireAdmin();
    adminId = user.id;
    adminName = profile.name;
  } catch {
    return { success: false, error: "Hanya admin yang dapat membuat laporan tamu." };
  }

  // 2. Parse & validate
  const rawData = {
    type: formData.get("type") as string,
    itemName: formData.get("itemName") as string,
    categoryId: formData.get("categoryId") as string,
    description: formData.get("description") as string,
    location: formData.get("location") as string,
    date: formData.get("date") as string,
    time: formData.get("time") as string,
    guestName: formData.get("guestName") as string,
    guestPhone: formData.get("guestPhone") as string,
  };

  const parsed = guestReportSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0] as string;
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    });
    return { success: false, fieldErrors };
  }

  const validData = parsed.data;

  // 3. Read, validate, & upload images
  const imageFiles = formData.getAll("images") as File[];
  const validImages = imageFiles.filter(
    (f) => f instanceof File && f.size > 0
  );

  if (validImages.length > MAX_IMAGES) {
    return { success: false, error: `Maksimal ${MAX_IMAGES} foto per laporan.` };
  }

  const imageBuffers: { buffer: Buffer; name: string; type: string }[] = [];
  for (const file of validImages) {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return {
        success: false,
        error: `File "${file.name}" melebihi batas maksimal 5MB.`,
      };
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `Format file "${file.name}" tidak didukung. Gunakan JPG, PNG, atau WEBP.`,
      };
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (!validateMagicBytes(buf, file.type)) {
      return {
        success: false,
        error: `File "${file.name}" tidak valid atau rusak.`,
      };
    }

    imageBuffers.push({ buffer: buf, name: file.name, type: file.type });
  }

  // Upload images
  const uploadedImages: { url: string; fileName: string }[] = [];
  if (imageBuffers.length > 0) {
    const uploadResults = await Promise.all(
      imageBuffers.map((img) => {
        const ext = img.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const fileName = `guest/${Date.now()}-${nanoid(6)}.${ext}`;
        return uploadReportImage(img.buffer, fileName, img.type);
      })
    );
    for (const result of uploadResults) {
      if (result) uploadedImages.push(result);
    }
  }

  // 4. Transaction: create report (auto-VERIFIED) + audit log
  try {
    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.report.create({
        data: {
          type: validData.type,
          itemName: validData.itemName,
          categoryId: validData.categoryId,
          description: validData.description || null,
          location: validData.location,
          date: new Date(validData.date),
          time: validData.time || null,
          reporterId: adminId, // Admin as proxy reporter
          status: "VERIFIED", // Auto-verified since admin created
          verifiedAt: new Date(),
          isGuest: true,
          guestName: validData.guestName,
          guestPhone: validData.guestPhone,
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

      await tx.auditLog.create({
        data: {
          action: AUDIT_ACTIONS.GUEST_REPORT_CREATED,
          actorId: adminId,
          targetType: "Report",
          targetId: newReport.id,
          detail: `Admin '${adminName}' membuat laporan tamu: "${validData.itemName}" (tamu: ${validData.guestName}, HP: ${validData.guestPhone})`,
        },
      });

      return newReport;
    });

    redirect(`/admin/reports/${report.id}?success=Laporan+tamu+berhasil+dibuat`);

    return { success: true, reportId: report.id };
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err;

    // Rollback uploaded images
    if (uploadedImages.length > 0) {
      await supabaseAdmin.storage
        .from("report-images")
        .remove(uploadedImages.map((img) => img.fileName));
    }

    console.error("createGuestReport error:", err);
    return {
      success: false,
      error: "Terjadi kesalahan pada server. Silakan coba lagi.",
    };
  }
}
