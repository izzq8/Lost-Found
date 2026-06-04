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

const LOCAL_APP_URL = "http://localhost:3000";

type RecoveryUrlEnv = Record<string, string | undefined>;

function normalizeAppUrl(url: string) {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return "";

  const urlWithProtocol = /^https?:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  return urlWithProtocol.replace(/\/+$/, "");
}

function isLocalhostUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function resolveRecoveryAppUrl(env: RecoveryUrlEnv = process.env) {
  const configuredUrl =
    env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_VERCEL_URL || env.VERCEL_URL;
  const appUrl = configuredUrl ? normalizeAppUrl(configuredUrl) : "";

  if (appUrl) {
    if (env.NODE_ENV === "production" && isLocalhostUrl(appUrl)) {
      throw new Error("Password recovery app URL must not be localhost in production.");
    }

    return appUrl;
  }

  if (env.NODE_ENV === "production") {
    throw new Error("Password recovery app URL is not configured.");
  }

  return LOCAL_APP_URL;
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
