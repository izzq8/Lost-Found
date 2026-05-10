"use server";

import { requireAuth } from "@/lib/utils/auth-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { profile } = await requireAuth();

    // 1. Verify current password by attempting sign-in
    const supabase = await createServerSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });

    if (signInError) {
      return { success: false, error: "Password saat ini salah." };
    }

    // 2. Validate new password
    if (newPassword.length < 6) {
      return { success: false, error: "Password baru minimal 6 karakter." };
    }

    if (currentPassword === newPassword) {
      return { success: false, error: "Password baru tidak boleh sama dengan password saat ini." };
    }

    // 3. Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { success: false, error: "Gagal mengubah password. Silakan coba lagi." };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("changePassword error:", error);
    return { success: false, error: "Terjadi kesalahan. Silakan coba lagi." };
  }
}
