import { createClient } from "@supabase/supabase-js";

// ⚠️ Service role key — NEVER expose to client
// Hanya untuk operasi server-side yang membutuhkan akses admin:
// - createUser (registrasi tanpa email verification)
// - updateUserById (reset password)
// - deleteUser (hapus akun)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
