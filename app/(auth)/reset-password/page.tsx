import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { KeyRound } from "lucide-react";
import { RECOVERY_COOKIE_NAME } from "@/lib/auth/password-recovery";
import ResetPasswordForm from "./reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Buat password baru untuk akun LostFound SMK Forward Nusantara.",
};

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const canResetPassword = cookieStore.has(RECOVERY_COOKIE_NAME);

  return (
    <div className="space-y-6">
      <div className="flex justify-center mb-8">
        <div className="bg-slate-800 rounded-full p-2.5 flex items-center justify-center">
          <KeyRound className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Buat Password Baru</h2>
          <p className="text-slate-500 text-sm mt-2 px-2">
            Masukkan password baru untuk menyelesaikan proses reset akun.
          </p>
        </div>

        {canResetPassword ? (
          <ResetPasswordForm />
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600">
              Link reset password tidak valid atau sudah kedaluwarsa.
            </p>
            <Link
              href="/forgot-password"
              className="w-full flex justify-center py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold transition-colors"
            >
              Minta Link Baru
            </Link>
          </div>
        )}
      </div>

      <p className="text-center text-slate-400 text-xs mt-8">
        &copy; 2026 SMK Forward Nusantara. Hak Cipta Dilindungi.
      </p>
    </div>
  );
}
