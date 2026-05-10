import type { Metadata } from "next";
import RegisterForm from "./register-form";
import Link from "next/link";
import { Search } from "lucide-react";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Daftar Akun",
  description: "Buat akun baru untuk sistem pelaporan barang SMK Forward Nusantara",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      {/* Brand Logo Lockup */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="LostFound SMKFN Logo" width={32} height={32} className="shrink-0" />
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            LostFound <span className="text-orange-500 font-extrabold">SMKFN</span>
          </h1>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Buat Akun</h2>
          <p className="text-slate-500 text-sm mt-1">
            Gunakan kode pendaftaran dari admin.
          </p>
        </div>

        <RegisterForm />

        <div className="mt-6 text-center space-y-4">
          <div className="text-sm text-slate-600">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="text-orange-600 font-semibold hover:text-orange-700 hover:underline transition-colors"
            >
              Masuk di sini
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-slate-400 text-xs mt-8">
        © 2026 SMK Forward Nusantara. Hak Cipta Dilindungi.
      </p>
    </div>
  );
}
