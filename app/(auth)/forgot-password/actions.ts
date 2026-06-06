"use server";

import { prisma } from "@/lib/prisma/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  RECOVERY_SUCCESS_MESSAGE,
  buildRecoveryRedirectUrl,
  normalizeRecoveryEmail,
  resolveRecoveryAppUrl,
} from "@/lib/auth/password-recovery";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Format email tidak valid"),
});

export type ForgotPasswordState = {
  error?: string;
  fieldErrors?: {
    email?: string[];
  };
  success?: boolean;
  message?: string;
};

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const raw = {
    email: formData.get("email") as string,
  };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const email = normalizeRecoveryEmail(parsed.data.email);

  try {
    const profile = await prisma.profile.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        status: "ACTIVE",
      },
    });

    if (!profile) {
      return { success: true, message: RECOVERY_SUCCESS_MESSAGE };
    }

    const supabase = await createServerSupabaseClient();
    const appUrl = resolveRecoveryAppUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: buildRecoveryRedirectUrl(appUrl),
    });

    if (error) {
      console.error("[Forgot Password Supabase Error]", error.message);
      return { error: "Link reset password belum dapat dikirim. Silakan coba lagi nanti." };
    }

    await prisma.auditLog.create({
      data: {
        action: "PASSWORD_RESET_EMAIL_REQUESTED",
        actorId: profile.id,
        targetType: "User",
        targetId: profile.id,
        detail: `User '${profile.name}' meminta link reset password via email.`,
      },
    });

    return { success: true, message: RECOVERY_SUCCESS_MESSAGE };
  } catch (err) {
    console.error("[Forgot Password Error]", err);
    return { error: "Terjadi kesalahan server saat memproses permintaan." };
  }
}
