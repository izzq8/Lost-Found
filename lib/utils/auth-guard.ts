import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

/**
 * Verifikasi bahwa request berasal dari user yang sudah login dan aktif.
 * Mengembalikan auth user + profile dari database.
 * Throw error jika tidak terautentikasi atau akun dinonaktifkan.
 */
export async function requireAuth() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized: Silakan login terlebih dahulu");
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  if (!profile) {
    throw new Error("Unauthorized: Profil tidak ditemukan");
  }

  if (profile.status === "DEACTIVATED") {
    throw new Error("Forbidden: Akun Anda telah dinonaktifkan");
  }

  return { user, profile };
}

/**
 * Verifikasi bahwa request berasal dari admin yang aktif.
 * Throw error jika bukan admin.
 */
export async function requireAdmin() {
  const { user, profile } = await requireAuth();

  if (profile.role !== "ADMIN") {
    throw new Error("Forbidden: Hanya admin yang dapat mengakses fitur ini");
  }

  return { user, profile };
}
