import { z } from "zod";

export const MAX_CLAIM_IMAGES = 3;
export const MAX_CLAIM_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_CLAIM_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const claimSchema = z.object({
  reportId: z.string().uuid({ message: "ID laporan tidak valid." }),
  description: z
    .string()
    .min(10, { message: "Deskripsi minimal 10 karakter." })
    .max(1000, { message: "Deskripsi maksimal 1000 karakter." }),
  // Catatan: validasi gambar (file) dilakukan di Server Action / Client, bukan di schema ini 
  // karena FormData tidak langsung support Type File Zod di semua environment Next.js
});

export type ClaimFormInput = z.infer<typeof claimSchema>;
