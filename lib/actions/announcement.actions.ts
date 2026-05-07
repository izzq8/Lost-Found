"use server";

import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { announcementSchema } from "@/lib/validations/announcement.schema";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS, AUDIT_ACTIONS, MAX_FILE_SIZE } from "@/lib/utils/constants";
import { revalidatePath } from "next/cache";

// === Magic Bytes Validation ===
const IMAGE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

async function validateImageMagicBytes(file: File, expectedType: string): Promise<boolean> {
  const signatures = IMAGE_SIGNATURES[expectedType];
  if (!signatures) return false;
  const buffer = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  return signatures.some((sig) => sig.every((byte, i) => bytes[i] === byte));
}

// === Create Announcement ===
export async function createAnnouncement(formData: FormData) {
  try {
    const { user } = await requireAdmin();

    const raw = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      publishAt: formData.get("publishAt") as string,
      expiredAt: formData.get("expiredAt") as string,
    };

    const parsed = announcementSchema.parse(raw);
    const imageFile = formData.get("image") as File | null;

    // Validate dates
    const publishDate = new Date(parsed.publishAt);
    const expireDate = new Date(parsed.expiredAt);
    if (expireDate <= publishDate) {
      return { success: false, error: "Tanggal expired harus setelah tanggal publish." };
    }

    let imageUrl: string | null = null;

    // Handle image upload
    if (imageFile && imageFile.size > 0) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) {
        return { success: false, error: "Format gambar harus JPEG, PNG, atau WebP." };
      }
      if (imageFile.size > MAX_FILE_SIZE) {
        return { success: false, error: "Ukuran gambar maksimal 5MB." };
      }
      const valid = await validateImageMagicBytes(imageFile, imageFile.type);
      if (!valid) {
        return { success: false, error: "File gambar tidak valid (magic bytes mismatch)." };
      }

      const ext = imageFile.type.split("/")[1] === "jpeg" ? "jpg" : imageFile.type.split("/")[1];
      const fileName = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { data, error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.ANNOUNCEMENT_IMAGES)
        .upload(fileName, imageFile, { contentType: imageFile.type });

      if (uploadError || !data) {
        return { success: false, error: "Gagal mengunggah gambar." };
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(STORAGE_BUCKETS.ANNOUNCEMENT_IMAGES)
        .getPublicUrl(data.path);
      imageUrl = urlData.publicUrl;
    }

    await prisma.$transaction(async (tx) => {
      await tx.announcement.create({
        data: {
          title: parsed.title,
          content: parsed.content,
          imageUrl,
          publishAt: publishDate,
          expiredAt: expireDate,
          createdBy: user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AUDIT_ACTIONS.ANNOUNCEMENT_CREATED,
          actorId: user.id,
          targetType: "Announcement",
          detail: `Membuat pengumuman: "${parsed.title}"`,
        },
      });
    });

    revalidatePath("/admin/announcements");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("createAnnouncement error:", error);
    if (error?.issues) {
      return { success: false, error: error.issues[0]?.message || "Validasi gagal." };
    }
    return { success: false, error: "Terjadi kesalahan saat membuat pengumuman." };
  }
}

// === Update Announcement ===
export async function updateAnnouncement(formData: FormData) {
  try {
    const { user } = await requireAdmin();
    const announcementId = formData.get("announcementId") as string;
    if (!announcementId) return { success: false, error: "ID pengumuman tidak valid." };

    const raw = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      publishAt: formData.get("publishAt") as string,
      expiredAt: formData.get("expiredAt") as string,
    };

    const parsed = announcementSchema.parse(raw);
    const imageFile = formData.get("image") as File | null;

    const publishDate = new Date(parsed.publishAt);
    const expireDate = new Date(parsed.expiredAt);
    if (expireDate <= publishDate) {
      return { success: false, error: "Tanggal expired harus setelah tanggal publish." };
    }

    const existing = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!existing) return { success: false, error: "Pengumuman tidak ditemukan." };

    let imageUrl = existing.imageUrl;

    // Handle new image upload
    if (imageFile && imageFile.size > 0) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) {
        return { success: false, error: "Format gambar harus JPEG, PNG, atau WebP." };
      }
      if (imageFile.size > MAX_FILE_SIZE) {
        return { success: false, error: "Ukuran gambar maksimal 5MB." };
      }
      const valid = await validateImageMagicBytes(imageFile, imageFile.type);
      if (!valid) {
        return { success: false, error: "File gambar tidak valid." };
      }

      // Delete old image
      if (existing.imageUrl) {
        const oldPath = existing.imageUrl.split("/").pop();
        if (oldPath) {
          await supabaseAdmin.storage.from(STORAGE_BUCKETS.ANNOUNCEMENT_IMAGES).remove([oldPath]);
        }
      }

      const ext = imageFile.type.split("/")[1] === "jpeg" ? "jpg" : imageFile.type.split("/")[1];
      const fileName = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { data, error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.ANNOUNCEMENT_IMAGES)
        .upload(fileName, imageFile, { contentType: imageFile.type });

      if (uploadError || !data) {
        return { success: false, error: "Gagal mengunggah gambar." };
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(STORAGE_BUCKETS.ANNOUNCEMENT_IMAGES)
        .getPublicUrl(data.path);
      imageUrl = urlData.publicUrl;
    }

    await prisma.$transaction(async (tx) => {
      await tx.announcement.update({
        where: { id: announcementId },
        data: {
          title: parsed.title,
          content: parsed.content,
          imageUrl,
          publishAt: publishDate,
          expiredAt: expireDate,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AUDIT_ACTIONS.ANNOUNCEMENT_UPDATED,
          actorId: user.id,
          targetType: "Announcement",
          targetId: announcementId,
          detail: `Mengubah pengumuman: "${parsed.title}"`,
        },
      });
    });

    revalidatePath("/admin/announcements");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("updateAnnouncement error:", error);
    if (error?.issues) {
      return { success: false, error: error.issues[0]?.message || "Validasi gagal." };
    }
    return { success: false, error: "Terjadi kesalahan saat mengubah pengumuman." };
  }
}

// === Delete Announcement ===
export async function deleteAnnouncement(id: string) {
  try {
    const { user } = await requireAdmin();

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Pengumuman tidak ditemukan." };

    // Delete image from storage
    if (existing.imageUrl && existing.imageUrl.startsWith("http")) {
      const path = existing.imageUrl.split("/").pop();
      if (path) {
        await supabaseAdmin.storage.from(STORAGE_BUCKETS.ANNOUNCEMENT_IMAGES).remove([path]);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.announcement.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          action: AUDIT_ACTIONS.ANNOUNCEMENT_DELETED,
          actorId: user.id,
          targetType: "Announcement",
          targetId: id,
          detail: `Menghapus pengumuman: "${existing.title}"`,
        },
      });
    });

    revalidatePath("/admin/announcements");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("deleteAnnouncement error:", error);
    return { success: false, error: "Gagal menghapus pengumuman." };
  }
}
