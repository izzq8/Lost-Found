import { z } from "zod";

export const commentSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Komentar tidak boleh kosong." })
    .max(500, { message: "Komentar maksimal 500 karakter." }),
  reportId: z.string().uuid().optional(),
  claimId: z.string().uuid().optional(),
}).refine((data) => data.reportId || data.claimId, {
  message: "Komentar harus terkait dengan laporan atau klaim.",
  path: ["reportId"],
});

export type CommentFormInput = z.infer<typeof commentSchema>;
