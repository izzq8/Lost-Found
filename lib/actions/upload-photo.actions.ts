"use server";

import { requireAdmin } from "@/lib/utils/auth-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";

/**
 * Server action to upload a photo to Supabase Storage.
 * Uses supabaseAdmin (service role) to bypass RLS.
 */
export async function uploadDocumentationPhoto(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    await requireAdmin();

    const file = formData.get("file") as File | null;
    const storageBucket = formData.get("storageBucket") as string;
    const storagePath = formData.get("storagePath") as string;

    if (!file || !(file instanceof File)) {
      return { success: false, error: "File foto wajib diunggah." };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "Ukuran file maksimal 5MB." };
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return { success: false, error: "Format file harus JPEG, PNG, atau WebP." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `${storagePath}/${Date.now()}-${nanoid(6)}.${ext}`;

    const { data, error: uploadError } = await supabaseAdmin.storage
      .from(storageBucket)
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    if (uploadError || !data) {
      console.error("Photo upload error:", uploadError);
      return { success: false, error: "Gagal mengunggah foto. Silakan coba lagi." };
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(storageBucket)
      .getPublicUrl(data.path);

    return { success: true, url: publicUrl };
  } catch (err: any) {
    console.error("uploadDocumentationPhoto error:", err);
    return { success: false, error: "Terjadi kesalahan saat mengunggah." };
  }
}
