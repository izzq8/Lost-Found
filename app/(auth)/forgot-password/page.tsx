import type { Metadata } from "next";
import ForgotPasswordForm from "./forgot-password-form";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Lupa Password",
  description: "Kirim link reset password akun LostFound SMK Forward Nusantara",
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      {/* Brand Icon */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2">
           <div className="bg-slate-800 rounded-full p-2.5 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Lupa Password?</h2>
          <p className="text-slate-500 text-sm mt-2 px-2">
            Masukkan email sekolah Anda. Sistem akan mengirim link untuk membuat password baru jika akun aktif.
          </p>
        </div>

        <ForgotPasswordForm />
      </div>

      {/* Footer */}
      <p className="text-center text-slate-400 text-xs mt-8">
        © 2026 SMK Fn. Hak Cipta Dilindungi.
      </p>
    </div>
  );
}
