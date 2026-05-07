"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createAdminAccount } from "@/lib/actions/admin.actions";

const jabatanOptions = [
  { value: "SECURITY", label: "Security" },
  { value: "FRONT_OFFICE", label: "Front Office" },
  { value: "GURU_PIKET", label: "Guru Piket" },
];

export default function CreateAdminForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createAdminAccount(formData);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => router.push("/admin/users"), 1500);
    } else {
      setError(result.error || "Gagal membuat akun.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Akun Admin Berhasil Dibuat!</h3>
        <p className="text-sm text-slate-500">Mengalihkan ke halaman manajemen user...</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl p-6 sm:p-8 flex flex-col gap-5 border border-slate-100 shadow-sm"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">
          {error}
        </div>
      )}

      {/* Nama Lengkap */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-semibold text-slate-700">
          Nama Lengkap
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Masukkan nama lengkap"
          required
          className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
        />
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="nama@smkfn.sch.id"
          required
          className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Minimal 8 karakter"
          required
          minLength={8}
          className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
        />
      </div>

      {/* Confirm Password */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">
          Konfirmasi Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Ulangi password"
          required
          className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
        />
      </div>

      {/* Jabatan */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="jabatan" className="text-sm font-semibold text-slate-700">
          Jabatan
        </label>
        <select
          id="jabatan"
          name="jabatan"
          required
          defaultValue=""
          className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all appearance-none cursor-pointer"
        >
          <option value="" disabled>
            Pilih jabatan
          </option>
          {jabatanOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-slate-100">
        <Link
          href="/admin/users"
          className="h-11 flex items-center justify-center px-6 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 transition-colors"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="h-11 flex items-center justify-center gap-2 px-6 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Buat Akun Admin
        </button>
      </div>
    </form>
  );
}
