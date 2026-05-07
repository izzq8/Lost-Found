"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Email atau password salah. Silakan coba lagi." };
    }
    return { error: "Terjadi kesalahan. Silakan coba lagi." };
  }

  // Cek apakah akun aktif
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Terjadi kesalahan autentikasi." };

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (profile?.status === "DEACTIVATED") {
    await supabase.auth.signOut();
    return { error: "Akun Anda telah dinonaktifkan. Hubungi admin untuk informasi lebih lanjut." };
  }

  // Redirect berdasarkan role
  if (profile?.role === "ADMIN") {
    redirect("/admin");
  }
  redirect("/dashboard");
}
