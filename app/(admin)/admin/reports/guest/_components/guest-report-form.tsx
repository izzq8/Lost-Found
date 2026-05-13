"use client";

import { useEffect, useRef, useState } from "react";
import { createGuestReport } from "@/lib/actions/admin-report.actions";
import {
  User, Phone, Package, MapPin, Calendar, Clock, FileText,
  ImagePlus, X, Loader2, Tag,
} from "lucide-react";
import { OptimizedThumbnail } from "@/components/shared/optimized-thumbnail";
import { createImagePreview, prepareImageForUpload, revokeImagePreview } from "@/lib/utils/image-client";

interface CategoryItem {
  id: string;
  name: string;
}

interface ImagePreview {
  file: File;
  previewUrl: string;
}

export default function GuestReportForm({ categories }: { categories: CategoryItem[] }) {
  const [type, setType] = useState<"LOST" | "FOUND">("FOUND");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [imageFiles, setImageFiles] = useState<ImagePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFilesRef = useRef<ImagePreview[]>([]);

  useEffect(() => {
    imageFilesRef.current = imageFiles;
  }, [imageFiles]);

  useEffect(() => {
    return () => {
      imageFilesRef.current.forEach((image) => revokeImagePreview(image.previewUrl));
    };
  }, []);

  const handleImageAdd = async (files: FileList | null) => {
    if (!files) return;
    const newFiles: ImagePreview[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files).slice(0, 3 - imageFiles.length)) {
      try {
        const optimizedFile = await prepareImageForUpload(file);
        newFiles.push({
          file: optimizedFile,
          previewUrl: createImagePreview(optimizedFile),
        });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `Gagal memproses "${file.name}".`);
      }
    }
    setImageFiles((prev) => [...prev, ...newFiles].slice(0, 3));
    setError(errors.length > 0 ? errors.join(" ") : null);
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => {
      revokeImagePreview(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("type", type);

    // Remove old images, add current
    formData.delete("images");
    imageFiles.forEach((image) => formData.append("images", image.file));

    const result = await createGuestReport(formData);
    if (!result.success) {
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      else if (result.error) setError(result.error);
    }
    setLoading(false);
  };

  const FieldError = ({ name }: { name: string }) => {
    const errors = fieldErrors[name];
    if (!errors?.length) return null;
    return <p className="text-xs text-red-500 mt-1">{errors[0]}</p>;
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">
          {error}
        </div>
      )}

      {/* Type Selector */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">1</div>
          <h3 className="text-sm font-bold text-slate-800">Tipe Laporan</h3>
        </div>
        <div className="flex gap-2">
          {(["FOUND", "LOST"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                type === t
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t === "FOUND" ? "Barang Ditemukan" : "Barang Hilang"}
            </button>
          ))}
        </div>
      </div>

      {/* Guest Info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">2</div>
          <h3 className="text-sm font-bold text-slate-800">Identitas Tamu</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <User size={12} /> Nama Tamu
            </label>
            <input
              name="guestName"
              type="text"
              placeholder="Nama lengkap tamu"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
            <FieldError name="guestName" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <Phone size={12} /> No. HP
            </label>
            <input
              name="guestPhone"
              type="tel"
              placeholder="08xxxxxxxxxx"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
            <FieldError name="guestPhone" />
          </div>
        </div>
      </div>

      {/* Item Info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">3</div>
          <h3 className="text-sm font-bold text-slate-800">Detail Barang</h3>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <Package size={12} /> Nama Barang
            </label>
            <input
              name="itemName"
              type="text"
              placeholder="Contoh: Dompet hitam kulit"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
            <FieldError name="itemName" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <Tag size={12} /> Kategori
            </label>
            <select
              name="categoryId"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 cursor-pointer"
            >
              <option value="">Pilih kategori...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <FieldError name="categoryId" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <MapPin size={12} /> Lokasi
            </label>
            <input
              name="location"
              type="text"
              placeholder="Contoh: Depan ruang kelas X-A"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
            <FieldError name="location" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
                <Calendar size={12} /> Tanggal
              </label>
              <input
                name="date"
                type="date"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
              <FieldError name="date" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
                <Clock size={12} /> Waktu (opsional)
              </label>
              <input
                name="time"
                type="time"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
              <FieldError name="time" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
              <FileText size={12} /> Deskripsi (opsional)
            </label>
            <textarea
              name="description"
              placeholder="Ciri-ciri tambahan atau keterangan lainnya..."
              rows={3}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 resize-none"
            />
            <FieldError name="description" />
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">4</div>
          <h3 className="text-sm font-bold text-slate-800">Foto (opsional, maks. 3)</h3>
        </div>

        <div className="flex gap-2 flex-wrap">
          {imageFiles.map((image, i) => (
            <div key={i} className="w-20 h-20 rounded-xl border border-slate-200 relative overflow-hidden group">
              <OptimizedThumbnail
                src={image.previewUrl}
                alt={`Preview ${i + 1}`}
                className="absolute inset-0"
                sizes="80px"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {imageFiles.length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:text-orange-500 hover:border-orange-300 transition-colors cursor-pointer"
            >
              <ImagePlus size={20} />
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleImageAdd(e.target.files)}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Package size={18} />}
        Buat Laporan Tamu
      </button>
    </form>
  );
}
