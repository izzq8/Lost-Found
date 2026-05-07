import { z } from "zod";

export const announcementSchema = z.object({
  title: z
    .string()
    .min(3, "Judul minimal 3 karakter")
    .max(200, "Judul maksimal 200 karakter")
    .transform((s) => s.trim()),
  content: z
    .string()
    .min(10, "Konten minimal 10 karakter")
    .max(2000, "Konten maksimal 2000 karakter")
    .transform((s) => s.trim()),
  publishAt: z.string().min(1, "Tanggal publish wajib diisi"),
  expiredAt: z.string().min(1, "Tanggal expired wajib diisi"),
});
