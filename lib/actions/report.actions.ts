"use server";

import { requireAuth, requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";
import {
  reportSchema,
  editReportLimitedSchema,
  MAX_DAILY_REPORTS,
  MAX_IMAGES,
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/validations/report.schema";

// ── MAGIC BYTES VALIDATOR ─────────────────────────────────────────────────────
// Mencegah file berbahaya yang disamarkan dengan ekstensi gambar palsu
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
async function uploadReportImage(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<{ url: string; fileName: string } | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from("report-images")
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
    } = supabaseAdmin.storage.from("report-images").getPublicUrl(data.path);

    return { url: publicUrl, fileName };
  } catch (err) {
    console.error("uploadReportImage failed:", err);
    return null;
  }
}

// ── SERVER ACTION: CREATE REPORT ──────────────────────────────────────────────
export type CreateReportState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  reportId?: string;
};

export async function createReport(
  formData: FormData
): Promise<CreateReportState> {
  // 1. Auth guard — wajib login dan akun ACTIVE
  let userId: string;
  try {
    const { user } = await requireAuth();
    userId = user.id;
  } catch {
    return { success: false, error: "Anda harus login untuk membuat laporan." };
  }

  // 2. Parse & validate input dengan Zod (server-side — tidak bisa di-bypass)
  const rawData = {
    type: formData.get("type") as string,
    itemName: formData.get("itemName") as string,
    categoryId: formData.get("categoryId") as string,
    description: formData.get("description") as string,
    location: formData.get("location") as string,
    date: formData.get("date") as string,
    time: formData.get("time") as string,
  };

  const parsed = reportSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0] as string;
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    });
    return { success: false, fieldErrors };
  }

  const validData = parsed.data;
  const reportDate = new Date(validData.date);

  // 3. Read, validate, & upload gambar
  // PENTING: Baca file ke Buffer SEKALI, lalu gunakan buffer untuk validasi DAN upload
  const imageFiles = formData.getAll("images") as File[];
  const validImages = imageFiles.filter(
    (f) => f instanceof File && f.size > 0
  );

  if (validImages.length > MAX_IMAGES) {
    return {
      success: false,
      error: `Maksimal ${MAX_IMAGES} foto per laporan.`,
    };
  }

  // Baca semua file ke buffer SEKALI, lalu validasi
  const imageBuffers: { buffer: Buffer; name: string; type: string; size: number }[] = [];
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

    // Baca file ke buffer SEKALI — jangan panggil arrayBuffer() lagi setelah ini
    const buf = Buffer.from(await file.arrayBuffer());

    // Validasi magic bytes dari buffer yang sudah dibaca
    if (!validateMagicBytes(buf, file.type)) {
      return {
        success: false,
        error: `File "${file.name}" tidak valid atau rusak.`,
      };
    }

    imageBuffers.push({ buffer: buf, name: file.name, type: file.type, size: file.size });
  }

  // Upload gambar ke Supabase Storage (bisa paralel)
  const uploadedImages: { url: string; fileName: string }[] = [];
  if (imageBuffers.length > 0) {
    const uploadResults = await Promise.all(
      imageBuffers.map((img) => {
        const ext = img.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const fileName = `${userId}/${Date.now()}-${nanoid(6)}.${ext}`;
        return uploadReportImage(img.buffer, fileName, img.type);
      })
    );
    for (const result of uploadResults) {
      if (result) uploadedImages.push(result);
    }
  }

  // 4. Prisma Transaction — atomic: count check + create report + audit log
  try {
    const report = await prisma.$transaction(async (tx) => {
      // Re-check batas laporan INSIDE transaction → anti concurrency race condition
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const dailyCount = await tx.report.count({
        where: {
          reporterId: userId,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      });

      if (dailyCount >= MAX_DAILY_REPORTS) {
        throw new Error("DAILY_LIMIT_EXCEEDED");
      }

      // Buat laporan
      const newReport = await tx.report.create({
        data: {
          type: validData.type,
          itemName: validData.itemName,
          categoryId: validData.categoryId,
          description: validData.description || null,
          location: validData.location,
          date: new Date(validData.date),
          time: validData.time || null,
          reporterId: userId,
          status: "PENDING",
          // Buat gambar jika ada
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

      // Audit log
      await tx.auditLog.create({
        data: {
          action: "REPORT_CREATED",
          actorId: userId,
          targetType: "Report",
          targetId: newReport.id,
          detail: `Laporan ${validData.type} dibuat: "${validData.itemName}" di ${validData.location}`,
        },
      });

      return newReport;
    });

    // 5. Return success (client handles redirect + popup)
    return { success: true, reportId: report.id };
  } catch (err: any) {
    // Rollback gambar yang sudah di-upload jika transaction gagal
    if (uploadedImages.length > 0) {
      await supabaseAdmin.storage
        .from("report-images")
        .remove(uploadedImages.map((img) => img.fileName));
    }

    if (err.message === "DAILY_LIMIT_EXCEEDED") {
      return {
        success: false,
        error: `Anda sudah mencapai batas maksimal ${MAX_DAILY_REPORTS} laporan per hari. Silakan coba lagi besok.`,
      };
    }

    console.error("createReport error:", err);
    return {
      success: false,
      error: "Terjadi kesalahan pada server. Silakan coba lagi.",
    };
  }
}

// ── SERVER ACTION: DELETE REPORT ──────────────────────────────────────────────

export async function deleteReport(reportId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAuth();

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { images: true },
    });

    if (!report) {
      return { success: false, error: "Laporan tidak ditemukan." };
    }

    if (report.reporterId !== user.id) {
      return { success: false, error: "Akses ditolak: Anda bukan pemilik laporan ini." };
    }

    if (report.status !== "PENDING") {
      return { success: false, error: "Hanya laporan berstatus PENDING yang dapat dihapus." };
    }

    // 1. Hapus gambar dari Supabase Storage jika ada
    if (report.images.length > 0) {
      const fileNames = report.images.map((img) => img.fileName);
      const { error: storageError } = await supabaseAdmin.storage.from("report-images").remove(fileNames);
      if (storageError) {
        console.error("Failed to delete images from storage:", storageError.message);
      }
    }

    // 2. Hapus laporan + audit log dalam transaction
    await prisma.$transaction(async (tx) => {
      await tx.report.delete({ where: { id: reportId } });

      await tx.auditLog.create({
        data: {
          action: "REPORT_DELETED",
          actorId: user.id,
          targetType: "Report",
          targetId: reportId,
          detail: `User '${profile.name}' menghapus laporan ${report.type}: "${report.itemName}"`,
        },
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("deleteReport error:", error);
    return { success: false, error: "Gagal menghapus laporan. Silakan coba lagi." };
  }
}

// ── SERVER ACTION: VERIFY REPORT (ADMIN) ──────────────────────────────────────

export async function verifyReport(reportId: string, receivedPhotoUrl?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, status: true, itemName: true, reporterId: true, type: true },
    });

    if (!report) return { success: false, error: "Laporan tidak ditemukan." };
    if (report.status !== "PENDING") return { success: false, error: "Hanya laporan PENDING yang dapat diverifikasi." };

    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: reportId },
        data: { status: "VERIFIED", verifiedAt: new Date() },
      });

      // For FOUND reports: store the admin's received-item photo as a ReportImage
      if (report.type === "FOUND" && receivedPhotoUrl) {
        await tx.reportImage.create({
          data: {
            reportId,
            url: receivedPhotoUrl,
            fileName: "admin-received-photo",
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: report.reporterId,
          type: "REPORT_VERIFIED",
          message: `Laporan Anda "${report.itemName}" telah diverifikasi dan dipublikasikan.`,
          data: { reportId: report.id },
        },
      });

      await tx.auditLog.create({
        data: {
          action: "REPORT_VERIFIED",
          actorId: user.id,
          targetType: "Report",
          targetId: reportId,
          detail: `Admin '${profile.name}' memverifikasi laporan "${report.itemName}"${receivedPhotoUrl ? " (dengan foto penerimaan)" : ""}.`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("verifyReport error:", err);
    return { success: false, error: "Gagal memverifikasi laporan." };
  }
}

// ── SERVER ACTION: REJECT REPORT (ADMIN) ──────────────────────────────────────

export async function rejectReport(reportId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    if (!reason || reason.trim().length < 5) {
      return { success: false, error: "Alasan penolakan wajib diisi (minimal 5 karakter)." };
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, status: true, itemName: true, reporterId: true },
    });

    if (!report) return { success: false, error: "Laporan tidak ditemukan." };
    if (report.status !== "PENDING") return { success: false, error: "Hanya laporan PENDING yang dapat ditolak." };

    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: reportId },
        data: { status: "REJECTED", rejectionReason: reason.trim() },
      });

      await tx.notification.create({
        data: {
          userId: report.reporterId,
          type: "REPORT_REJECTED",
          message: `Laporan Anda "${report.itemName}" ditolak. Alasan: ${reason.trim()}`,
          data: { reportId: report.id },
        },
      });

      await tx.auditLog.create({
        data: {
          action: "REPORT_REJECTED",
          actorId: user.id,
          targetType: "Report",
          targetId: reportId,
          detail: `Admin '${profile.name}' menolak laporan "${report.itemName}". Alasan: ${reason.trim()}`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("rejectReport error:", err);
    return { success: false, error: "Gagal menolak laporan." };
  }
}

// ── SERVER ACTION: RESOLVE REPORT (SOFT CLOSE) ───────────────────────────────

export async function resolveReport(reportId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAuth();

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, status: true, itemName: true, type: true, reporterId: true },
    });

    if (!report) return { success: false, error: "Laporan tidak ditemukan." };
    if (report.reporterId !== user.id) return { success: false, error: "Anda bukan pemilik laporan ini." };
    if (report.status !== "VERIFIED") return { success: false, error: "Hanya laporan VERIFIED yang dapat ditandai selesai." };

    // Cek apakah ada FoundMatch aktif
    const activeFoundMatch = await prisma.foundMatch.findFirst({
      where: {
        reportId,
        status: { in: ["PENDING", "APPROVED", "ITEM_RECEIVED"] },
      },
    });

    if (activeFoundMatch) {
      return { success: false, error: "Tidak dapat menutup laporan — ada proses pengembalian yang sedang berjalan." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: reportId },
        data: { status: "RESOLVED" },
      });

      // Notifikasi ke admin
      const admins = await tx.profile.findMany({
        where: { role: "ADMIN", status: "ACTIVE" },
        select: { id: true },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "REPORT_RESOLVED",
            message: `User '${profile.name}' menutup laporan "${report.itemName}" — barang ditemukan di luar sistem.`,
            data: { reportId: report.id },
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          action: "REPORT_RESOLVED",
          actorId: user.id,
          targetType: "Report",
          targetId: reportId,
          detail: `User '${profile.name}' menandai laporan "${report.itemName}" sebagai sudah ditemukan (di luar sistem).`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("resolveReport error:", err);
    return { success: false, error: "Gagal menutup laporan. Silakan coba lagi." };
  }
}

// ── SERVER ACTION: EDIT REPORT ────────────────────────────────────────────────

export type EditReportState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function editReport(
  reportId: string,
  formData: FormData
): Promise<EditReportState> {
  let userId: string;
  let profileName: string;
  try {
    const { user, profile } = await requireAuth();
    userId = user.id;
    profileName = profile.name;
  } catch {
    return { success: false, error: "Anda harus login." };
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { images: true },
  });

  if (!report) return { success: false, error: "Laporan tidak ditemukan." };
  if (report.reporterId !== userId) return { success: false, error: "Anda bukan pemilik laporan ini." };

  // ── PENDING: Full edit ─────────────────────────────────────────────────────
  if (report.status === "PENDING") {
    const rawData = {
      type: formData.get("type") as string,
      itemName: formData.get("itemName") as string,
      categoryId: formData.get("categoryId") as string,
      description: formData.get("description") as string,
      location: formData.get("location") as string,
      date: formData.get("date") as string,
      time: formData.get("time") as string,
    };

    const parsed = reportSchema.safeParse(rawData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
      });
      return { success: false, fieldErrors };
    }

    const validData = parsed.data;

    // Handle image changes for PENDING reports
    const keepImageIds = (formData.get("keepImageIds") as string || "")
      .split(",")
      .filter(Boolean);

    // Find images to delete
    const imagesToDelete = report.images.filter((img) => !keepImageIds.includes(img.id));

    // Process new images
    const imageFiles = formData.getAll("images") as File[];
    const validNewImages = imageFiles.filter((f) => f instanceof File && f.size > 0);
    const totalImages = keepImageIds.length + validNewImages.length;

    if (totalImages > MAX_IMAGES) {
      return { success: false, error: `Maksimal ${MAX_IMAGES} foto per laporan.` };
    }

    // Read & validate new images
    const imageBuffers: { buffer: Buffer; name: string; type: string }[] = [];
    for (const file of validNewImages) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        return { success: false, error: `File "${file.name}" melebihi batas 5MB.` };
      }
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return { success: false, error: `Format "${file.name}" tidak didukung.` };
      }
      const buf = Buffer.from(await file.arrayBuffer());
      if (!validateMagicBytes(buf, file.type)) {
        return { success: false, error: `File "${file.name}" tidak valid.` };
      }
      imageBuffers.push({ buffer: buf, name: file.name, type: file.type });
    }

    // Upload new images
    const uploadedImages: { url: string; fileName: string }[] = [];
    if (imageBuffers.length > 0) {
      const uploadResults = await Promise.all(
        imageBuffers.map((img) => {
          const ext = img.name.split(".").pop()?.toLowerCase() ?? "jpg";
          const fileName = `${userId}/${Date.now()}-${nanoid(6)}.${ext}`;
          return uploadReportImage(img.buffer, fileName, img.type);
        })
      );
      for (const result of uploadResults) {
        if (result) uploadedImages.push(result);
      }
    }

    // Delete removed images from storage
    if (imagesToDelete.length > 0) {
      await supabaseAdmin.storage
        .from("report-images")
        .remove(imagesToDelete.map((img) => img.fileName));
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.report.update({
          where: { id: reportId },
          data: {
            itemName: validData.itemName,
            categoryId: validData.categoryId,
            description: validData.description || null,
            location: validData.location,
            date: new Date(validData.date),
            time: validData.time || null,
          },
        });

        // Delete removed images from DB
        if (imagesToDelete.length > 0) {
          await tx.reportImage.deleteMany({
            where: { id: { in: imagesToDelete.map((img) => img.id) } },
          });
        }

        // Add new images to DB
        if (uploadedImages.length > 0) {
          await tx.reportImage.createMany({
            data: uploadedImages.map((img) => ({
              reportId,
              url: img.url,
              fileName: img.fileName,
            })),
          });
        }

        await tx.auditLog.create({
          data: {
            action: "REPORT_EDITED",
            actorId: userId,
            targetType: "Report",
            targetId: reportId,
            detail: `User '${profileName}' mengedit laporan PENDING "${validData.itemName}" (full edit).`,
          },
        });
      });

      return { success: true };
    } catch (err: any) {
      if (err.message === "NEXT_REDIRECT") throw err;
      // Rollback newly uploaded images
      if (uploadedImages.length > 0) {
        await supabaseAdmin.storage
          .from("report-images")
          .remove(uploadedImages.map((img) => img.fileName));
      }
      console.error("editReport PENDING error:", err);
      return { success: false, error: "Gagal menyimpan perubahan." };
    }
  }

  // ── VERIFIED: Limited edit (description + location only) ───────────────────
  if (report.status === "VERIFIED") {
    // Block edit if there's an active FoundMatch
    const activeFoundMatch = await prisma.foundMatch.findFirst({
      where: {
        reportId,
        status: { in: ["PENDING", "APPROVED", "ITEM_RECEIVED"] },
      },
    });

    if (activeFoundMatch) {
      return { success: false, error: "Tidak dapat mengedit — ada proses pengembalian yang sedang berjalan." };
    }

    const rawData = {
      description: formData.get("description") as string,
      location: formData.get("location") as string,
    };

    const parsed = editReportLimitedSchema.safeParse(rawData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
      });
      return { success: false, fieldErrors };
    }

    const validData = parsed.data;
    const changedFields: string[] = [];
    if (validData.description !== (report.description ?? "")) changedFields.push("deskripsi");
    if (validData.location !== report.location) changedFields.push("lokasi");

    if (changedFields.length === 0) {
      return { success: false, error: "Tidak ada perubahan yang terdeteksi." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: reportId },
        data: {
          description: validData.description || null,
          location: validData.location,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "REPORT_EDITED",
          actorId: userId,
          targetType: "Report",
          targetId: reportId,
          detail: `User '${profileName}' mengedit laporan VERIFIED "${report.itemName}" (field: ${changedFields.join(", ")}).`,
        },
      });
    });

    return { success: true };
  }

  return { success: false, error: "Laporan dengan status ini tidak dapat diedit." };
}
