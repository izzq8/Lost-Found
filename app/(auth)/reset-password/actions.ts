"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  RECOVERY_COOKIE_NAME,
  validateResetPasswordInput,
} from "@/lib/auth/password-recovery";

export type ResetPasswordState = {
  error?: string;
  fieldErrors?: {
    password?: string[];
    confirmPassword?: string[];
  };
  success?: boolean;
};

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = validateResetPasswordInput({
    password: (formData.get("password") as string) ?? "",
    confirmPassword: (formData.get("confirmPassword") as string) ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.fieldErrors };
  }

  const cookieStore = await cookies();
  if (!cookieStore.has(RECOVERY_COOKIE_NAME)) {
    return { error: "Link reset password tidak valid atau sudah kedaluwarsa." };
  }

  const supabase = await createServerSupabaseClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      cookieStore.delete(RECOVERY_COOKIE_NAME);
      return { error: "Sesi reset password tidak valid. Silakan minta link baru." };
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, status: true },
    });

    if (!profile || profile.status !== "ACTIVE") {
      cookieStore.delete(RECOVERY_COOKIE_NAME);
      await supabase.auth.signOut();
      return { error: "Akun tidak aktif. Silakan hubungi admin sekolah." };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.password,
    });

    if (updateError) {
      return { error: "Password belum dapat diperbarui. Silakan coba lagi." };
    }

    await prisma.auditLog.create({
      data: {
        action: "PASSWORD_RESET_EMAIL_COMPLETED",
        actorId: profile.id,
        targetType: "User",
        targetId: profile.id,
        detail: `User '${profile.name}' memperbarui password melalui link reset email.`,
      },
    });

    cookieStore.delete(RECOVERY_COOKIE_NAME);
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    console.error("[Reset Password Error]", error);
    return { error: "Terjadi kesalahan server saat memperbarui password." };
  }
}
