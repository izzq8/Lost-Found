"use server";

import { prisma } from "@/lib/prisma/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { redirect } from "next/navigation";

// Zod Schema dengan rules yang ketat untuk keamanan & UX
const registerSchema = z.object({
  name: z.string().min(3, "Nama lengkap harus minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[a-zA-Z]/, "Password harus memiliki setidaknya satu huruf")
    .regex(/[0-9]/, "Password harus memiliki setidaknya satu angka"),
  enrollmentCode: z.string().min(1, "Kode Pendaftaran wajib diisi"),
});

export type RegisterState = {
  error?: string;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    password?: string[];
    enrollmentCode?: string[];
  };
  success?: boolean;
};

export async function registerAction(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    enrollmentCode: (formData.get("enrollmentCode") as string).toUpperCase(),
  };

  // 1. Zod Validation
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password, enrollmentCode } = parsed.data;

  try {
    // 2. Validate Code in Prisma
    const validCode = await prisma.enrollmentCode.findFirst({
      where: {
        code: enrollmentCode,
        status: "ACTIVE",
        OR: [{ expiredAt: null }, { expiredAt: { gt: new Date() } }],
      },
    });

    if (!validCode) {
      return {
        fieldErrors: {
          enrollmentCode: ["Kode Pendaftaran tidak valid atau sudah kedaluwarsa"],
        },
      };
    }

    // 3. Determine Jabatan base on Code Type
    const jabatan = validCode.type === "SISWA" ? "SISWA" : "GURU";

    // 4. Create user in Supabase Auth (Using Admin bypass to auto-confirm email)
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role: "USER",
          jabatan,
        },
      });

    if (authError || !authUser.user) {
      // Specifically handle email already exists
      if (authError?.message.includes("already registered")) {
        return { fieldErrors: { email: ["Email ini sudah terdaftar"] } };
      }
      return { error: `Gagal mengakses layanan autentikasi: ${authError?.message}` };
    }

    const userId = authUser.user.id;

    // 5. Atomic Prisma Transaction (Profile, Enrollment Count, AuditLog)
    try {
      await prisma.$transaction(async (tx) => {
        // Buat Profile
        await tx.profile.create({
          data: {
            id: userId,
            email,
            name,
            role: "USER",
            jabatan,
            status: "ACTIVE",
          },
        });

        // Increment usage count of the code
        await tx.enrollmentCode.update({
          where: { id: validCode.id },
          data: { usageCount: { increment: 1 } },
        });

        // Tulis log Audit
        await tx.auditLog.create({
          data: {
            action: "USER_REGISTERED",
            actorId: userId,
            targetType: "Profile",
            targetId: userId,
            detail: `User '${name}' mendaftar sebagai ${jabatan} menggunakan kode ${validCode.code}`,
          },
        });
      });
    } catch (transactionError) {
      // [SECURITY ROLLBACK] - Jika prisma gagal, user auth di supabase harus dihapus
      // Mencegah ada akun Auth yang bisa login tapi tidak punya Profile db
      console.error("[Register] Transaction Failed. Rolling back Supabase Auth.", transactionError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { error: "Gagal menyimpan data database. Pendaftaran dibatalkan otomatis demi keamanan." };
    }

  } catch (err: any) {
    console.error("[Register Action Error]", err);
    return { error: "Terjadi kesalahan internal server" };
  }

  // 6. Sign in the user automatically
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // 7. Redirect to dashboard
  redirect("/dashboard");
}
