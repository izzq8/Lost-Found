"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { claimSchema, MAX_CLAIM_IMAGES } from "@/lib/validations/claim.schema";
import { submitClaim } from "@/lib/actions/claim.actions";
import { useRouter } from "next/navigation";
import { UploadCloud, X, Loader2, ImagePlus } from "lucide-react";

export default function ClaimFormClient({ reportId, itemName }: { reportId: string; itemName: string }) {
  const router = useRouter();
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(claimSchema),
    defaultValues: { reportId, description: "" },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...selectedFiles].slice(0, MAX_CLAIM_IMAGES));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setServerError(null);

    const formData = new FormData();
    formData.append("reportId", data.reportId);
    formData.append("description", data.description);
    images.forEach((img) => formData.append("images", img));

    const result = await submitClaim(formData);

    if (result.success) {
      router.push("/dashboard/my-claims?success=Klaim+berhasil+diajukan.+Menunggu+verifikasi+admin.");
    } else {
      setServerError(result.error || "Gagal mengajukan klaim.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {serverError && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
          {serverError}
        </div>
      )}

      {/* Deskripsi */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700">
          Deskripsi Ciri-ciri Barang <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register("description")}
          rows={5}
          placeholder={`Sebutkan ciri-ciri spesifik / detail ${itemName}...`}
          className={`w-full p-3 rounded-xl border bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all resize-y ${
            errors.description ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-orange-500"
          }`}
        />
        {errors.description && (
          <p className="text-red-500 text-xs mt-1">{errors.description.message as string}</p>
        )}
      </div>

      {/* Upload Bukti */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700">
          Bukti Kepemilikan (Opsional)
        </label>
        <p className="text-xs text-slate-500 -mt-1">Upload foto nota, garansi, atau foto Anda dengan barang tersebut (Maks {MAX_CLAIM_IMAGES} foto)</p>
        
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((file, i) => (
            <div key={i} className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden group">
              <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-red-50 text-slate-600 hover:text-red-500 rounded-lg shadow-sm"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {images.length < MAX_CLAIM_IMAGES && (
            <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-orange-500 group">
              <ImagePlus size={28} className="mb-2" />
              <span className="text-xs font-semibold text-center px-2">Tambah Foto</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageChange} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Mengirim...
            </>
          ) : (
            "Ajukan Klaim"
          )}
        </button>
      </div>
    </form>
  );
}
