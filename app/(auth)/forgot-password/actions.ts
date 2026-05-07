"use server";

import { prisma } from "@/lib/prisma/client";
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

  const { email } = parsed.data;

  try {
    // 1. Check if user exists
    const user = await prisma.profile.findFirst({
      where: { email },
    });

    if (!user) {
      // Kita kembalikan error spesifik karena aplikasi internal sekolah 
      // (lebih baik transparan agar user sadar mereka belum terdaftar)
      return { error: "Email belum terdaftar di sistem kami." };
    }

    // 2. Cek apakah ada request PENDING yang masih terbuka
    const existingRequest = await prisma.passwordResetRequest.findFirst({
       where: {
         userId: user.id,
         status: "PENDING"
       }
    });

    if (existingRequest) {
       return { error: "Permintaan reset untuk email ini sedang diproses. Silakan hubungi admin sekolah." };
    }

    // 3. Create Password Reset Request
    await prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        status: "PENDING",
      },
    });

    // 4. Audit Log
    await prisma.auditLog.create({
      data: {
        action: "PASSWORD_RESET_REQUESTED",
        actorId: user.id,
        targetType: "PasswordResetRequest",
        detail: `User ${email} meminta reset password manual via login page.`,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[Forgot Password Error]", err);
    return { error: "Terjadi kesalahan server saat memproses permintaan." };
  }
}
