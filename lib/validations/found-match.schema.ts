// lib/validations/found-match.schema.ts
import { z } from "zod";

export const foundMatchSchema = z.object({
  reportId: z.string().uuid("Report ID tidak valid"),
  description: z
    .string({ error: "Deskripsi wajib diisi" })
    .min(10, "Deskripsi minimal 10 karakter")
    .max(500, "Deskripsi maksimal 500 karakter")
    .trim(),
});

export type FoundMatchFormValues = z.infer<typeof foundMatchSchema>;

// Constants
export const MAX_FOUND_MATCH_IMAGES = 3;
export const MAX_FOUND_MATCH_IMAGE_SIZE_MB = 5;
export const MAX_FOUND_MATCH_IMAGE_SIZE_BYTES = MAX_FOUND_MATCH_IMAGE_SIZE_MB * 1024 * 1024;
export const ALLOWED_FOUND_MATCH_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
