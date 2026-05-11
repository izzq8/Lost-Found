"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { registerAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, {});
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Preserve form values on failed submission
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const [nameValue, setNameValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [codeValue, setCodeValue] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Restore preserved values after failed submission (native form resets all fields)
  useEffect(() => {
    if (state?.error || state?.fieldErrors) {
      if (nameRef.current) nameRef.current.value = nameValue;
      if (emailRef.current) emailRef.current.value = emailValue;
      if (codeRef.current) codeRef.current.value = codeValue;
    }
  }, [state, nameValue, emailValue, codeValue]);

  return (
    <form action={formAction} className="space-y-4 flex flex-col items-center">
      {state?.error && (
        <div className="p-3 w-full bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2 mb-2 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Nama Input */}
      <div className="space-y-1.5 w-full">
        <Label htmlFor="name" className="text-slate-700 font-medium text-sm ml-1">
          Nama Lengkap
        </Label>
        <Input
          ref={nameRef}
          id="name"
          name="name"
          type="text"
          placeholder="Ahmad Rizki Pratama"
          onChange={(e) => setNameValue(e.target.value)}
          className={cn(
            "h-11 bg-white/50 backdrop-blur-sm border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-orange-500 rounded-xl",
            state?.fieldErrors?.name && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        {state?.fieldErrors?.name && (
          <p className="text-xs text-red-500 ml-1 mt-0.5">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      {/* Email Input */}
      <div className="space-y-1.5 w-full">
        <Label htmlFor="email" className="text-slate-700 font-medium text-sm ml-1">
          Email Sekolah
        </Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          placeholder="Masukkan Emailmu..."
          onChange={(e) => setEmailValue(e.target.value)}
          className={cn(
            "h-11 bg-white/50 backdrop-blur-sm border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-orange-500 rounded-xl",
            state?.fieldErrors?.email && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        {state?.fieldErrors?.email && (
          <p className="text-xs text-red-500 ml-1 mt-0.5">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      {/* Password Input */}
      <div className="space-y-1.5 w-full">
        <Label htmlFor="password" className="text-slate-700 font-medium text-sm ml-1">
          Password
        </Label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Masukkan Passwordmu..."
            className={cn(
              "w-full h-11 px-3 pr-11 bg-white/50 backdrop-blur-sm border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all rounded-xl text-sm",
              state?.fieldErrors?.password && "border-red-500 focus:ring-red-500"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        {state?.fieldErrors?.password && (
          <p className="text-xs text-red-500 ml-1 mt-0.5">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      {/* Enrollment Code Input */}
      <div className="space-y-1.5 w-full">
        <div className="flex justify-between items-center ml-1">
          <Label htmlFor="enrollmentCode" className="text-slate-700 font-medium text-sm">
            Kode Pendaftaran
          </Label>
          <span className="text-[10px] text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full font-semibold">Wajib</span>
        </div>
        <Input
          ref={codeRef}
          id="enrollmentCode"
          name="enrollmentCode"
          type="text"
          placeholder="Contoh: FWD-SISWA-XXXXXX"
          onChange={(e) => setCodeValue(e.target.value)}
          className={cn(
            "h-11 bg-white/50 backdrop-blur-sm border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-orange-500 rounded-xl uppercase",
            state?.fieldErrors?.enrollmentCode && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        {state?.fieldErrors?.enrollmentCode && (
          <p className="text-xs text-red-500 ml-1 mt-0.5">{state.fieldErrors.enrollmentCode[0]}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending || !mounted}
        className="w-full h-11 mt-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 transition-all font-semibold text-base"
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Mendaftarkan...
          </>
        ) : (
          "Buat Akun"
        )}
      </Button>
    </form>
  );
}
