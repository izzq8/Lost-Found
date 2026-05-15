import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Route yang tidak perlu auth
const publicRoutes = ["/login", "/register", "/forgot-password"];
const authCallbackRoutes = ["/auth/reset-password/callback"];
// Route khusus admin
const adminRoutes = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  // Buat Supabase client di middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session jika expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (authCallbackRoutes.some((r) => pathname.startsWith(r))) {
    return response;
  }

  // 1. Public routes — redirect ke dashboard jika sudah login
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    if (user) {
      const role = user.user_metadata?.role;
      const target = role === "ADMIN" ? "/admin" : "/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return response;
  }

  // 2. Protected routes — redirect ke login jika belum auth
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Admin routes — cek role dari user_metadata
  if (adminRoutes.some((r) => pathname.startsWith(r))) {
    const role = user.user_metadata?.role;
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
