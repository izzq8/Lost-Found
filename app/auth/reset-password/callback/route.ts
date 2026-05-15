import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { RECOVERY_COOKIE_NAME } from "@/lib/auth/password-recovery";

function redirectTo(request: NextRequest, pathname: string, error?: string) {
  const url = new URL(pathname, request.url);
  if (error) url.searchParams.set("error", error);
  return url;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(redirectTo(request, "/forgot-password", "invalid-link"));
  }

  const response = NextResponse.redirect(redirectTo(request, "/reset-password"));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[Reset Password Callback Error]", error.message);
    return NextResponse.redirect(redirectTo(request, "/forgot-password", "expired-link"));
  }

  response.cookies.set(RECOVERY_COOKIE_NAME, "1", {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
