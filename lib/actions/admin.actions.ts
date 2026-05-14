"use server";

import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ── CREATE ADMIN ACCOUNT ──────────────────────────────────────────────────────

export async function createAdminAccount(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile: adminProfile } = await requireAdmin();

    const name = (formData.get("name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const jabatan = (formData.get("jabatan") as string)?.toUpperCase();

    // Validation
    if (!name || !email || !password || !jabatan) {
      return { success: false, error: "Semua field wajib diisi." };
    }
    if (password.length < 8) {
      return { success: false, error: "Password minimal 8 karakter." };
    }
    if (password !== confirmPassword) {
      return { success: false, error: "Konfirmasi password tidak cocok." };
    }
    if (!["SECURITY", "FRONT_OFFICE", "GURU_PIKET"].includes(jabatan)) {
      return { success: false, error: "Jabatan tidak valid." };
    }

    // Check existing email
    const existing = await prisma.profile.findUnique({ where: { email } });
    if (existing) {
      return { success: false, error: "Email sudah terdaftar." };
    }

    // Create in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: "ADMIN", jabatan },
    });

    if (authError || !authData.user) {
      return { success: false, error: `Gagal membuat akun: ${authError?.message}` };
    }

    // Create profile in DB
    await prisma.$transaction(async (tx) => {
      await tx.profile.create({
        data: {
          id: authData.user.id,
          email,
          name,
          role: "ADMIN",
          jabatan: jabatan as any,
          status: "ACTIVE",
        },
      });

      await tx.auditLog.create({
        data: {
          action: "ADMIN_CREATED",
          actorId: user.id,
          targetType: "User",
          targetId: authData.user.id,
          detail: `Admin '${adminProfile.name}' membuat akun admin baru '${name}' (${jabatan}).`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("createAdminAccount error:", err);
    return { success: false, error: "Gagal membuat akun admin." };
  }
}

// ── CATEGORY IMAGE UPLOAD HELPER ──────────────────────────────────────────────

const ALLOWED_CATEGORY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_CATEGORY_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

const IMAGE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

async function validateImageMagicBytes(file: File, mimeType: string): Promise<boolean> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, 8));
  const signatures = IMAGE_SIGNATURES[mimeType];
  if (!signatures) return false;
  return signatures.some((sig) => sig.every((byte, idx) => bytes[idx] === byte));
}

async function uploadCategoryImage(file: File): Promise<{ url: string; fileName: string } | null> {
  try {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const fileName = `category-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from("category-images")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Category image upload error:", error.message);
      return null;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("category-images")
      .getPublicUrl(data.path);

    return { url: publicUrl, fileName };
  } catch (err) {
    console.error("uploadCategoryImage failed:", err);
    return null;
  }
}

async function deleteCategoryImage(imageUrl: string) {
  try {
    // Extract filename from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split("/category-images/");
    if (pathParts.length < 2) return;
    const fileName = pathParts[1];
    await supabaseAdmin.storage.from("category-images").remove([fileName]);
  } catch (err) {
    console.error("deleteCategoryImage failed:", err);
  }
}

// ── CATEGORY CRUD ─────────────────────────────────────────────────────────────

export async function createCategory(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    const name = (formData.get("name") as string)?.trim();
    const file = formData.get("image") as File | null;

    if (!name) return { success: false, error: "Nama kategori wajib diisi." };
    if (!file || file.size === 0) return { success: false, error: "Gambar kategori wajib diunggah." };

    // Validate file type
    if (!ALLOWED_CATEGORY_IMAGE_TYPES.includes(file.type)) {
      return { success: false, error: "Format gambar harus JPEG, PNG, atau WebP." };
    }

    // Validate file size
    if (file.size > MAX_CATEGORY_IMAGE_SIZE) {
      return { success: false, error: "Ukuran gambar maksimal 2MB." };
    }

    // Validate magic bytes
    const isValid = await validateImageMagicBytes(file, file.type);
    if (!isValid) {
      return { success: false, error: "File gambar tidak valid atau rusak." };
    }

    // Check duplicate name
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) return { success: false, error: "Kategori dengan nama ini sudah ada." };

    // Upload image
    const uploadResult = await uploadCategoryImage(file);
    if (!uploadResult) return { success: false, error: "Gagal mengunggah gambar." };

    await prisma.$transaction(async (tx) => {
      const cat = await tx.category.create({
        data: { name, imageUrl: uploadResult.url },
      });

      await tx.auditLog.create({
        data: {
          action: "CATEGORY_CREATED",
          actorId: user.id,
          targetType: "Category",
          targetId: cat.id,
          detail: `Admin '${profile.name}' membuat kategori '${name}'.`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("createCategory error:", err);
    return { success: false, error: "Gagal membuat kategori." };
  }
}

export async function updateCategory(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    const categoryId = formData.get("categoryId") as string;
    const name = (formData.get("name") as string)?.trim();
    const file = formData.get("image") as File | null;
    const hasNewFile = file && file.size > 0;

    if (!categoryId) return { success: false, error: "ID kategori tidak valid." };
    if (!name) return { success: false, error: "Nama kategori wajib diisi." };

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return { success: false, error: "Kategori tidak ditemukan." };

    // Check duplicate name (excluding self)
    const existing = await prisma.category.findFirst({
      where: { name, id: { not: categoryId } },
    });
    if (existing) return { success: false, error: "Kategori dengan nama ini sudah ada." };

    let imageUrl = category.imageUrl;

    if (hasNewFile) {
      // Validate file
      if (!ALLOWED_CATEGORY_IMAGE_TYPES.includes(file.type)) {
        return { success: false, error: "Format gambar harus JPEG, PNG, atau WebP." };
      }
      if (file.size > MAX_CATEGORY_IMAGE_SIZE) {
        return { success: false, error: "Ukuran gambar maksimal 2MB." };
      }
      const isValid = await validateImageMagicBytes(file, file.type);
      if (!isValid) {
        return { success: false, error: "File gambar tidak valid atau rusak." };
      }

      // Upload new image
      const uploadResult = await uploadCategoryImage(file);
      if (!uploadResult) return { success: false, error: "Gagal mengunggah gambar baru." };

      // Delete old image
      if (category.imageUrl) {
        await deleteCategoryImage(category.imageUrl);
      }

      imageUrl = uploadResult.url;
    }

    await prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id: categoryId },
        data: { name, imageUrl },
      });

      await tx.auditLog.create({
        data: {
          action: "CATEGORY_UPDATED",
          actorId: user.id,
          targetType: "Category",
          targetId: categoryId,
          detail: `Admin '${profile.name}' mengubah kategori menjadi '${name}'.`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("updateCategory error:", err);
    return { success: false, error: "Gagal mengubah kategori." };
  }
}

export async function deleteCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    // Check if any reports use this category
    const reportCount = await prisma.report.count({ where: { categoryId } });
    if (reportCount > 0) {
      return { success: false, error: `Kategori ini digunakan oleh ${reportCount} laporan dan tidak bisa dihapus.` };
    }

    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) return { success: false, error: "Kategori tidak ditemukan." };

    // Delete image from storage
    if (cat.imageUrl) {
      await deleteCategoryImage(cat.imageUrl);
    }

    await prisma.$transaction(async (tx) => {
      await tx.category.delete({ where: { id: categoryId } });

      await tx.auditLog.create({
        data: {
          action: "CATEGORY_DELETED",
          actorId: user.id,
          targetType: "Category",
          targetId: categoryId,
          detail: `Admin '${profile.name}' menghapus kategori '${cat.name}'.`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("deleteCategory error:", err);
    return { success: false, error: "Gagal menghapus kategori." };
  }
}


// ── ENROLLMENT CODE MANAGEMENT ────────────────────────────────────────────────

export async function generateEnrollmentCode(
  type: "SISWA" | "GURU"
): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    // Generate random code
    const prefix = type === "SISWA" ? "FWD-SISWA" : "FWD-GURU";
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `${prefix}-${suffix}`;

    // Calculate expiry (end of current semester)
    const now = new Date();
    const month = now.getMonth();
    // Jan-Jun → expired Juli 31, Jul-Dec → expired Jan 31 next year
    const expiredAt = month < 6
      ? new Date(now.getFullYear(), 6, 31)
      : new Date(now.getFullYear() + 1, 0, 31);

    await prisma.$transaction(async (tx) => {
      // Deactivate existing active code of the same type
      await tx.enrollmentCode.updateMany({
        where: { type, status: "ACTIVE" },
        data: { status: "INACTIVE", deactivatedAt: new Date() },
      });

      // Create new code
      await tx.enrollmentCode.create({
        data: {
          code,
          type,
          status: "ACTIVE",
          createdBy: user.id,
          expiredAt,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "ENROLLMENT_CODE_GENERATED",
          actorId: user.id,
          targetType: "EnrollmentCode",
          detail: `Admin '${profile.name}' men-generate enrollment code ${type} baru: ${code}.`,
        },
      });
    });

    return { success: true, code };
  } catch (err: any) {
    console.error("generateEnrollmentCode error:", err);
    return { success: false, error: "Gagal membuat enrollment code." };
  }
}

export async function deactivateEnrollmentCode(
  codeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    const ec = await prisma.enrollmentCode.findUnique({ where: { id: codeId } });
    if (!ec) return { success: false, error: "Code tidak ditemukan." };
    if (ec.status === "INACTIVE") return { success: false, error: "Code sudah nonaktif." };

    await prisma.$transaction(async (tx) => {
      await tx.enrollmentCode.update({
        where: { id: codeId },
        data: { status: "INACTIVE", deactivatedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          action: "ENROLLMENT_CODE_DEACTIVATED",
          actorId: user.id,
          targetType: "EnrollmentCode",
          targetId: codeId,
          detail: `Admin '${profile.name}' menonaktifkan enrollment code '${ec.code}'.`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("deactivateEnrollmentCode error:", err);
    return { success: false, error: "Gagal menonaktifkan code." };
  }
}

// ── GET FILTERED REPORTS FOR EXPORT ────────────────────────────────────────────

export async function getFilteredReportsForExport(filters: {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  status?: string;
}) {
  try {
    await requireAdmin();

    const where: any = {};

    if (filters.type && filters.type !== "all") {
      where.type = filters.type;
    }
    if (filters.status && filters.status !== "all") {
      where.status = filters.status;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        reporter: { select: { name: true, jabatan: true } },
        foundMatches: {
          where: { status: { in: ["APPROVED", "ITEM_RECEIVED", "COMPLETED"] } },
          include: { finder: { select: { name: true } } },
          take: 1,
        },
        claims: {
          where: { status: { in: ["APPROVED", "COMPLETED"] } },
          include: { claimant: { select: { name: true } } },
          take: 1,
        },
      },
      take: 1000,
    });

    return reports.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      itemName: r.itemName,
      category: r.category.name,
      location: r.location,
      description: r.description || "-",
      reporterName: r.reporter.name,
      reporterJabatan: r.reporter.jabatan,
      finderName: r.foundMatches[0]?.finder?.name || "-",
      claimantName: r.claims[0]?.claimant?.name || "-",
      handoverPhotoUrl: r.foundMatches[0]?.handoverPhotoUrl || r.claims[0]?.handoverPhotoUrl || "-",
      pickupPhotoUrl: r.foundMatches[0]?.pickupPhotoUrl || "-",
      date: r.date.toISOString().split("T")[0],
      createdAt: r.createdAt.toISOString().split("T")[0],
      updatedAt: r.updatedAt.toISOString().split("T")[0],
    }));
  } catch (error) {
    console.error("getFilteredReportsForExport error:", error);
    return [];
  }
}

// ── ADMIN DELETE REPORT ───────────────────────────────────────────────────────

export async function adminDeleteReport(
  reportId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, profile } = await requireAdmin();

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        images: true,
        claims: { include: { images: true } },
        foundMatches: { include: { images: true } },
        comments: true,
      },
    });

    if (!report) {
      return { success: false, error: "Laporan tidak ditemukan." };
    }

    // Only allow delete for PENDING or REJECTED
    if (!["PENDING", "REJECTED"].includes(report.status)) {
      return {
        success: false,
        error: `Hanya laporan berstatus PENDING atau REJECTED yang dapat dihapus oleh admin. Status saat ini: ${report.status}.`,
      };
    }

    // 1. Collect all storage files to delete
    const filesToDelete: { bucket: string; files: string[] }[] = [];

    if (report.images.length > 0) {
      filesToDelete.push({
        bucket: "report-images",
        files: report.images.map((img) => img.fileName),
      });
    }

    for (const claim of report.claims) {
      if (claim.images.length > 0) {
        filesToDelete.push({
          bucket: "claim-images",
          files: claim.images.map((img) => img.fileName),
        });
      }
    }

    for (const fm of report.foundMatches) {
      if (fm.images.length > 0) {
        filesToDelete.push({
          bucket: "found-match-images",
          files: fm.images.map((img) => img.fileName),
        });
      }
    }

    // 2. Delete storage files
    for (const { bucket, files } of filesToDelete) {
      const { error } = await supabaseAdmin.storage.from(bucket).remove(files);
      if (error) {
        console.error(`Failed to delete from ${bucket}:`, error.message);
      }
    }

    // 3. Cascade delete in transaction
    await prisma.$transaction(async (tx) => {
      await tx.comment.deleteMany({ where: { reportId } });
      await tx.claimImage.deleteMany({ where: { claim: { reportId } } });
      await tx.claim.deleteMany({ where: { reportId } });
      await tx.foundMatchImage.deleteMany({ where: { foundMatch: { reportId } } });
      await tx.foundMatch.deleteMany({ where: { reportId } });
      await tx.reportImage.deleteMany({ where: { reportId } });
      await tx.report.delete({ where: { id: reportId } });

      await tx.auditLog.create({
        data: {
          action: "ADMIN_REPORT_DELETED",
          actorId: user.id,
          targetType: "Report",
          targetId: reportId,
          detail: `Admin '${profile.name}' menghapus laporan ${report.type}: "${report.itemName}" (status: ${report.status}).`,
        },
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("adminDeleteReport error:", error);
    return { success: false, error: "Gagal menghapus laporan." };
  }
}

// ── ADMIN DELETE USER ─────────────────────────────────────────────────────────

export async function adminDeleteUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: adminUser, profile: adminProfile } = await requireAdmin();

    // Prevent self-delete
    if (userId === adminUser.id) {
      return { success: false, error: "Anda tidak dapat menghapus akun Anda sendiri." };
    }

    const targetProfile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!targetProfile) {
      return { success: false, error: "User tidak ditemukan." };
    }

    // Check active reports
    const activeReportCount = await prisma.report.count({
      where: {
        reporterId: userId,
        status: { in: ["PENDING", "VERIFIED", "AWAITING_PICKUP"] },
      },
    });

    if (activeReportCount > 0) {
      return {
        success: false,
        error: `User memiliki ${activeReportCount} laporan aktif. Selesaikan/tolak semua laporan terlebih dahulu sebelum menghapus akun.`,
      };
    }

    // Check active claims
    const activeClaimCount = await prisma.claim.count({
      where: {
        claimantId: userId,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (activeClaimCount > 0) {
      return {
        success: false,
        error: `User memiliki ${activeClaimCount} klaim aktif. Selesaikan semua klaim terlebih dahulu.`,
      };
    }

    // 1. Collect and delete storage files
    const reportImages = await prisma.reportImage.findMany({
      where: { report: { reporterId: userId } },
    });
    if (reportImages.length > 0) {
      await supabaseAdmin.storage
        .from("report-images")
        .remove(reportImages.map((img) => img.fileName));
    }

    const claimImages = await prisma.claimImage.findMany({
      where: { claim: { claimantId: userId } },
    });
    if (claimImages.length > 0) {
      await supabaseAdmin.storage
        .from("claim-images")
        .remove(claimImages.map((img) => img.fileName));
    }

    const foundMatchImages = await prisma.foundMatchImage.findMany({
      where: { foundMatch: { finderId: userId } },
    });
    if (foundMatchImages.length > 0) {
      await supabaseAdmin.storage
        .from("found-match-images")
        .remove(foundMatchImages.map((img) => img.fileName));
    }

    // 2. Cascade delete all user data
    await prisma.$transaction(async (tx) => {
      await tx.comment.deleteMany({ where: { authorId: userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.foundMatchImage.deleteMany({ where: { foundMatch: { finderId: userId } } });
      await tx.foundMatch.deleteMany({ where: { finderId: userId } });
      await tx.claimImage.deleteMany({ where: { claim: { claimantId: userId } } });
      await tx.claim.deleteMany({ where: { claimantId: userId } });
      await tx.reportImage.deleteMany({ where: { report: { reporterId: userId } } });
      await tx.report.deleteMany({ where: { reporterId: userId } });
      await tx.profile.delete({ where: { id: userId } });

      await tx.auditLog.create({
        data: {
          action: "USER_DELETED",
          actorId: adminUser.id,
          targetType: "User",
          targetId: userId,
          detail: `Admin '${adminProfile.name}' menghapus akun '${targetProfile.name}' (${targetProfile.email}, ${targetProfile.role}).`,
        },
      });
    });

    // 3. Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("Failed to delete Supabase auth user:", authError.message);
    }

    return { success: true };
  } catch (error: any) {
    console.error("adminDeleteUser error:", error);
    return { success: false, error: "Gagal menghapus user." };
  }
}
