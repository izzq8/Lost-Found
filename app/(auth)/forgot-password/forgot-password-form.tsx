"use client";

import { useActionState, useEffect, useState } from "react";
import { forgotPasswordAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, {});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (state?.success) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 text-center mt-2 animate-in fade-in-0 duration-500">
        <div className="bg-green-100 p-3 rounded-full mb-2">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Permintaan Terkirim</h3>
        <p className="text-slate-600 text-sm">
          Permintaan reset password telah dicatat di sistem. Admin Tata Usaha akan segera mengatur ulang password Anda secara manual.
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
      {state?.error && (
        <div className="p-3 w-full bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2 mb-2 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="space-y-1.5 w-full">
        <Label htmlFor="email" className="text-slate-700 font-medium text-sm ml-1">
          Email Sekolah
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="nama@smkforwardnusantara.sch.id"
          autoComplete="email"
          className={cn(
            "h-11 bg-white/50 backdrop-blur-sm border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-orange-500 rounded-xl",
            state?.fieldErrors?.email && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        {state?.fieldErrors?.email && (
          <p className="text-xs text-red-500 ml-1 mt-0.5">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending || !mounted}
        className="w-full h-11 mt-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 transition-all font-semibold text-base"
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Memproses...
          </>
        ) : (
          "Minta Reset Password"
        )}
      </Button>
      
      <div className="w-full text-center mt-2">
         <Link
            href="/login"
            className="text-sm text-slate-500 hover:text-slate-800 hover:underline transition-colors block"
         >
            Batal
         </Link>
      </div>
    </form>
  );
}
