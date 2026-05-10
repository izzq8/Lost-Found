"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, {});
  const [mounted, setMounted] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const [emailValue, setEmailValue] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Preserve email value after failed submission
  useEffect(() => {
    if (state?.error && emailRef.current) {
      emailRef.current.value = emailValue;
    }
  }, [state, emailValue]);

  return (
    <form action={formAction} className="space-y-5 flex flex-col items-center">
      {state?.error && (
        <div className="p-3 w-full bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2 mb-2 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="space-y-2 w-full">
        <Label
          htmlFor="email"
          className="text-slate-700 font-medium text-sm ml-1"
        >
          Email
        </Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          placeholder="Email Kamu..."
          autoComplete="email"
          onChange={(e) => setEmailValue(e.target.value)}
          className={cn(
            "h-12 bg-white/50 backdrop-blur-sm border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-all rounded-xl",
            state?.fieldErrors?.email && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        {state?.fieldErrors?.email && (
          <p className="text-sm text-red-500 ml-1 mt-1">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      <div className="space-y-2 w-full">
        <Label htmlFor="password" className="text-slate-700 font-medium text-sm ml-1">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Password Kamu..."
          autoComplete="current-password"
          className={cn(
            "h-12 bg-white/50 backdrop-blur-sm border-slate-200 text-slate-800 focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-all rounded-xl",
            state?.fieldErrors?.password && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        {state?.fieldErrors?.password && (
          <p className="text-sm text-red-500 ml-1 mt-1">
            {state.fieldErrors.password[0]}
          </p>
        )}
        {/* Lupa Password — di bawah field password */}
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-orange-600 hover:text-orange-700 hover:underline font-medium"
          >
            Lupa Password?
          </Link>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending || !mounted}
        className="w-full h-12 mt-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 transition-all font-semibold text-base"
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Memproses...
          </>
        ) : (
          "Masuk"
        )}
      </Button>
    </form>
  );
}
