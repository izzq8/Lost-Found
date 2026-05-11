// lib/validations/report.schema.ts
// Zod schema shared antara client validation dan server action validation
// Compatible dengan Zod v4 (4.x — 'error' bukan 'required_error')

import { z } from "zod";

export const reportSchema = z.object({
  type: z.enum(["LOST", "FOUND"]),
  itemName: z
    .string({ error: "Nama barang wajib diisi" })
    .min(3, "Nama barang minimal 3 karakter")
    .max(100, "Nama barang maksimal 100 karakter")
    .trim(),
  categoryId: z
    .string({ error: "Kategori wajib dipilih" })
    .uuid("Kategori tidak valid"),
  description: z
    .string()
    .max(500, "Deskripsi maksimal 500 karakter")
    .trim()
    .optional()
    .or(z.literal("")),
  location: z
    .string({ error: "Lokasi wajib diisi" })
    .min(3, "Lokasi minimal 3 karakter")
    .max(200, "Lokasi maksimal 200 karakter")
    .trim(),
  date: z.string({ error: "Tanggal wajib diisi" })
    .min(1, "Tanggal wajib diisi")
    .refine((v) => !isNaN(Date.parse(v)), "Format tanggal tidak valid")
    .refine((v) => new Date(v) <= new Date(), "Tanggal tidak boleh di masa depan"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Format waktu tidak valid (HH:MM)")
    .optional()
    .or(z.literal("")),
});

export type ReportFormValues = z.infer<typeof reportSchema>;

// Schema untuk edit VERIFIED report (hanya description + location)
export const editReportLimitedSchema = z.object({
  description: z
    .string()
    .max(500, "Deskripsi maksimal 500 karakter")
    .trim()
    .optional()
    .or(z.literal("")),
  location: z
    .string({ error: "Lokasi wajib diisi" })
    .min(3, "Lokasi minimal 3 karakter")
    .max(200, "Lokasi maksimal 200 karakter")
    .trim(),
});

export type EditReportLimitedValues = z.infer<typeof editReportLimitedSchema>;

// Constants
export const MAX_DAILY_REPORTS = 4;
export const MAX_IMAGES = 3;
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// Schema untuk Guest Report (admin submit untuk tamu)
export const guestReportSchema = z.object({
  type: z.enum(["LOST", "FOUND"]),
  itemName: z
    .string({ error: "Nama barang wajib diisi" })
    .min(3, "Nama barang minimal 3 karakter")
    .max(100, "Nama barang maksimal 100 karakter")
    .trim(),
  categoryId: z
    .string({ error: "Kategori wajib dipilih" })
    .uuid("Kategori tidak valid"),
  description: z
    .string()
    .max(500, "Deskripsi maksimal 500 karakter")
    .trim()
    .optional()
    .or(z.literal("")),
  location: z
    .string({ error: "Lokasi wajib diisi" })
    .min(3, "Lokasi minimal 3 karakter")
    .max(200, "Lokasi maksimal 200 karakter")
    .trim(),
  date: z.string({ error: "Tanggal wajib diisi" })
    .min(1, "Tanggal wajib diisi")
    .refine((v) => !isNaN(Date.parse(v)), "Format tanggal tidak valid")
    .refine((v) => new Date(v) <= new Date(), "Tanggal tidak boleh di masa depan"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Format waktu tidak valid (HH:MM)")
    .optional()
    .or(z.literal("")),
  guestName: z
    .string({ error: "Nama tamu wajib diisi" })
    .min(2, "Nama tamu minimal 2 karakter")
    .max(100, "Nama tamu maksimal 100 karakter")
    .trim(),
  guestPhone: z
    .string({ error: "No. HP tamu wajib diisi" })
    .min(8, "No. HP minimal 8 digit")
    .max(20, "No. HP maksimal 20 digit")
    .trim(),
});

export type GuestReportFormValues = z.infer<typeof guestReportSchema>;

