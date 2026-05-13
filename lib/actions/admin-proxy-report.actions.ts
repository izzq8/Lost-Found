"use server";

import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";
import { reportSchema } from "@/lib/validations/report.schema";

/**
 * Admin creates a report on behalf of a registered user.
 * The report is auto-verified since it's created by admin.
 */
export async function createProxyReport(
  formData: FormData
): Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }> {
  try {
    const { user: adminUser, profile: adminProfile } = await requireAdmin();

    const targetUserId = formData.get("targetUserId") as string;
    if (!targetUserId) {
      return { success: false, error: "User tujuan harus dipilih." };
    }

    // Verify target user exists
    const targetUser = await prisma.profile.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, status: true },
    });

    if (!targetUser || targetUser.status !== "ACTIVE") {
      return { success: false, error: "User tidak ditemukan atau tidak aktif." };
    }

    // Validate form data
    const rawData = {
      type: formData.get("type") as string,
      itemName: formData.get("itemName") as string,
      categoryId: formData.get("categoryId") as string,
      location: formData.get("location") as string,
      date: formData.get("date") as string,
      time: (formData.get("time") as string) || "",
      description: (formData.get("description") as string) || "",
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

    // Handle date + time
    const dateStr = validData.date;
    const timeStr = validData.time || "00:00";
    const reportDate = new Date(`${dateStr}T${timeStr}:00`);

    // Upload images
    const imageFiles = formData.getAll("images") as File[];
    const validImages = imageFiles.filter((f) => f instanceof File && f.size > 0);
    const uploadedImages: { url: string; fileName: string }[] = [];

    for (const file of validImages.slice(0, 3)) {
      if (file.size > 5 * 1024 * 1024) continue;
      const buf = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const fileName = `${targetUserId}/${Date.now()}-${nanoid(6)}.${ext}`;

      const { data, error } = await supabaseAdmin.storage
        .from("report-images")
        .upload(fileName, buf, { contentType: file.type, upsert: false });

      if (!error && data) {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from("report-images")
          .getPublicUrl(data.path);
        uploadedImages.push({ url: publicUrl, fileName });
      }
    }

    // Create report in transaction
    await prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          type: validData.type as any,
          itemName: validData.itemName,
          categoryId: validData.categoryId,
          location: validData.location,
          date: reportDate,
          description: validData.description || null,
          reporterId: targetUserId,
          status: "VERIFIED", // Auto-verified by admin
          images: uploadedImages.length > 0 ? {
            create: uploadedImages.map((img) => ({
              url: img.url,
              fileName: img.fileName,
            })),
          } : undefined,
        },
      });

      // Notify the user
      await tx.notification.create({
        data: {
          userId: targetUserId,
          type: "REPORT_VERIFIED",
          message: `Admin telah membuat laporan "${validData.itemName}" atas nama Anda. Laporan sudah diverifikasi.`,
          data: { reportId: report.id },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          action: "REPORT_CREATED",
          actorId: adminUser.id,
          targetType: "Report",
          targetId: report.id,
          detail: `Admin '${adminProfile.name}' membuat laporan proxy untuk user '${targetUser.name}': "${validData.itemName}"`,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error("createProxyReport error:", err);
    return { success: false, error: "Gagal membuat laporan. Silakan coba lagi." };
  }
}

/**
 * Search for active users to use in proxy report dropdown.
 */
export async function searchUsersForProxy(query: string) {
  try {
    await requireAdmin();

    const users = await prisma.profile.findMany({
      where: {
        status: "ACTIVE",
        role: "USER",
        name: { contains: query, mode: "insensitive" },
      },
      select: { id: true, name: true, email: true, jabatan: true },
      take: 10,
      orderBy: { name: "asc" },
    });

    return users;
  } catch {
    return [];
  }
}
