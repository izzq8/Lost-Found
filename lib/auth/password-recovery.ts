export const RECOVERY_SUCCESS_MESSAGE =
  "Jika email terdaftar dan akun aktif, link reset password telah dikirim.";

export const RECOVERY_COOKIE_NAME = "password_recovery_pending";

export type ResetPasswordInput = {
  password: string;
  confirmPassword: string;
};

export type ResetPasswordValidationResult =
  | { success: true; password: string }
  | {
      success: false;
      fieldErrors: {
        password?: string[];
        confirmPassword?: string[];
      };
    };

export function normalizeRecoveryEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildRecoveryRedirectUrl(appUrl: string) {
  return `${appUrl.replace(/\/+$/, "")}/auth/reset-password/callback`;
}

export function validateResetPasswordInput({
  password,
  confirmPassword,
}: ResetPasswordInput): ResetPasswordValidationResult {
  const fieldErrors: {
    password?: string[];
    confirmPassword?: string[];
  } = {};

  if (password.length < 8) {
    fieldErrors.password = ["Password baru minimal 8 karakter."];
  }

  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = ["Konfirmasi password tidak cocok."];
  }

  if (fieldErrors.password || fieldErrors.confirmPassword) {
    return { success: false, fieldErrors };
  }

  return { success: true, password };
}
