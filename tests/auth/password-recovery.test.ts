import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RECOVERY_SUCCESS_MESSAGE,
  buildRecoveryRedirectUrl,
  normalizeRecoveryEmail,
  resolveRecoveryAppUrl,
  validateResetPasswordInput,
} from "../../lib/auth/password-recovery";

describe("password recovery helpers", () => {
  it("normalizes submitted recovery emails", () => {
    assert.equal(normalizeRecoveryEmail("  USER@SMKFN.SCH.ID  "), "user@smkfn.sch.id");
  });

  it("builds the Supabase recovery callback URL from the configured app URL", () => {
    assert.equal(
      buildRecoveryRedirectUrl("https://lostfound.example.com/"),
      "https://lostfound.example.com/auth/reset-password/callback"
    );
  });

  it("resolves the configured production app URL without a trailing slash", () => {
    assert.equal(
      resolveRecoveryAppUrl({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://lostfound.example.com/",
      }),
      "https://lostfound.example.com"
    );
  });

  it("uses the Vercel deployment URL with https when no app URL is configured", () => {
    assert.equal(
      resolveRecoveryAppUrl({
        NODE_ENV: "production",
        VERCEL_URL: "lostfound-smk.vercel.app",
      }),
      "https://lostfound-smk.vercel.app"
    );
  });

  it("allows localhost only outside production", () => {
    assert.equal(resolveRecoveryAppUrl({ NODE_ENV: "development" }), "http://localhost:3000");
  });

  it("rejects localhost recovery URLs in production", () => {
    assert.throws(
      () =>
        resolveRecoveryAppUrl({
          NODE_ENV: "production",
          NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        }),
      /Password recovery app URL must not be localhost in production/
    );
  });

  it("requires a recovery app URL in production", () => {
    assert.throws(
      () => resolveRecoveryAppUrl({ NODE_ENV: "production" }),
      /Password recovery app URL is not configured/
    );
  });

  it("returns field errors for weak or mismatched reset passwords", () => {
    const result = validateResetPasswordInput({
      password: "short",
      confirmPassword: "different",
    });

    assert.deepEqual(result, {
      success: false,
      fieldErrors: {
        password: ["Password baru minimal 8 karakter."],
        confirmPassword: ["Konfirmasi password tidak cocok."],
      },
    });
  });

  it("accepts matching reset passwords with at least 8 characters", () => {
    assert.deepEqual(
      validateResetPasswordInput({
        password: "Password123",
        confirmPassword: "Password123",
      }),
      { success: true, password: "Password123" }
    );
  });

  it("uses a generic recovery response message", () => {
    assert.equal(
      RECOVERY_SUCCESS_MESSAGE,
      "Jika email terdaftar dan akun aktif, link reset password telah dikirim."
    );
  });
});
