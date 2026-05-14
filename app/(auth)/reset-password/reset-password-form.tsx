"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resetPasswordAction } from "./actions";

export default function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (state.success) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 text-center mt-2 animate-in fade-in-0 duration-500">
        <div className="bg-green-100 p-3 rounded-full mb-2">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Password Diperbarui</h3>
        <p className="text-slate-600 text-sm">
          Password baru sudah tersimpan. Silakan login kembali dengan password baru Anda.
        </p>
        <Link
          href="/login"
          className="w-full mt-6 flex justify-center py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold transition-colors"
        >
          Kembali ke Login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5 flex flex-col items-center">
      {state.error && (
        <div className="p-3 w-full bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2 mb-2 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="space-y-1.5 w-full">
        <label htmlFor="password" className="text-slate-700 font-medium text-sm ml-1">
          Password Baru
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Minimal 8 karakter"
            autoComplete="new-password"
            className={cn(
              "w-full h-11 px-3 pr-11 bg-white/50 backdrop-blur-sm border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all rounded-xl text-sm",
              state.fieldErrors?.password && "border-red-500 focus:ring-red-500"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {state.fieldErrors?.password && (
          <p className="text-xs text-red-500 ml-1 mt-0.5">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      <div className="space-y-1.5 w-full">
        <label htmlFor="confirmPassword" className="text-slate-700 font-medium text-sm ml-1">
          Konfirmasi Password Baru
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Ulangi password baru"
            autoComplete="new-password"
            className={cn(
              "w-full h-11 px-3 pr-11 bg-white/50 backdrop-blur-sm border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all rounded-xl text-sm",
              state.fieldErrors?.confirmPassword && "border-red-500 focus:ring-red-500"
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
            tabIndex={-1}
            aria-label={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {state.fieldErrors?.confirmPassword && (
          <p className="text-xs text-red-500 ml-1 mt-0.5">
            {state.fieldErrors.confirmPassword[0]}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 mt-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 transition-all font-semibold text-base"
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Menyimpan...
          </>
        ) : (
          "Simpan Password Baru"
        )}
      </Button>
    </form>
  );
}
