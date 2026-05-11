"use client";

import { useRef, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reportSchema, ReportFormValues, MAX_IMAGES, MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/validations/report.schema";
import { createReport } from "@/lib/actions/report.actions";
import { PageHero } from "@/components/shared/page-hero";
import { PenLine, Upload, X, Info, ImageIcon, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
}

interface ReportFormClientProps {
  type: "LOST" | "FOUND";
  categories: Category[];
  dailyReportCount: number;
}

interface ImagePreview {
  file: File;
  previewUrl: string;
  name: string;
}

export default function ReportFormClient({
  type,
  categories,
  dailyReportCount,
}: ReportFormClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const isLost = type === "LOST";
  const isAtLimit = dailyReportCount >= 4;

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(reportSchema) as any,
    defaultValues: { type },
    mode: "onChange",
  });

  const today = new Date().toISOString().split("T")[0];
  const watchedDate = watch("date");
  const isToday = watchedDate === today;
  const now = new Date();
  const maxTime = isToday
    ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    : undefined;

  // Tambahkan file ke preview list
  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = MAX_IMAGES - imagePreviews.length;
    const toAdd = fileArray.slice(0, remaining);

    const newPreviews: ImagePreview[] = [];
    for (const file of toAdd) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setServerError(`File "${file.name}" melebihi 5MB.`);
        continue;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setServerError(`Format "${file.name}" tidak didukung.`);
        continue;
      }
      newPreviews.push({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
      });
    }

    setImagePreviews((prev) => [...prev, ...newPreviews]);
    setServerError(null);
  }, [imagePreviews.length]);

  const removeImage = (idx: number) => {
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const onSubmit = (data: any) => {
    if (isAtLimit) return;
    setServerError(null);

    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (value instanceof Date) {
            formData.append(key, value.toISOString().split("T")[0]);
          } else {
            formData.append(key, String(value));
          }
        }
      });
      imagePreviews.forEach((img) => formData.append("images", img.file));

      const result = await createReport(formData);
      if (result && result.success) {
        setShowSuccess(true);
      } else if (result && !result.success) {
        // Display server-side field errors if present (e.g. Zod validation failures)
        if (result.fieldErrors) {
          const messages = Object.values(result.fieldErrors).flat();
          setServerError(messages.join(", ") || "Validasi gagal. Periksa kembali form Anda.");
        } else {
          setServerError(result.error ?? "Terjadi kesalahan.");
        }
      }
    });
  };

  // Input style class helper
  const inputCls = (hasError?: boolean) =>
    `w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 bg-white
    ${hasError
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
    }`;

  const labelCls = "block text-sm font-semibold text-slate-700 mb-1.5";

  return (
    <div className="flex flex-col gap-5 max-w-[640px] mx-auto">
      {/* Back Link */}
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-slate-500 hover:text-orange-600 transition-colors w-fit text-sm font-medium cursor-pointer"
      >
        <ArrowLeft size={16} /> Kembali
      </button>

      {/* Hero */}
      <PageHero
        variant="compact"
        icon={PenLine}
        title={isLost ? "Lapor Barang Hilang" : "Lapor Barang Ditemukan"}
        subtitle={
          isLost
            ? "Isi form berikut untuk melaporkan barang Anda yang hilang"
            : "Isi form berikut untuk melaporkan barang yang Anda temukan"
        }
      />

      {/* Alert: batas laporan aktif */}
      <div
        className={`px-4 py-3 rounded-xl flex items-center gap-2.5 border text-sm ${
          isAtLimit
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-orange-50 border-orange-200 text-orange-700"
        }`}
      >
        <Info size={16} className="shrink-0" />
        <span>
          Laporan hari ini: <strong>{dailyReportCount}/4</strong>
          {isAtLimit && " — Anda sudah mencapai batas laporan harian."}
        </span>
      </div>

      {/* Alert: khusus FOUND */}
      {!isLost && (
        <div className="px-4 py-3 rounded-xl flex items-start gap-2.5 border bg-blue-50 border-blue-200 text-blue-700 text-sm">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>Setelah melapor, harap segera serahkan barang ke <strong>front office</strong> sekolah.</span>
        </div>
      )}

      {/* Server Error */}
      {serverError && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <X size={16} className="shrink-0 mt-0.5" />
          {serverError}
        </div>
      )}

      {/* Form Card */}
      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl p-5 md:p-6 flex flex-col gap-5"
        style={{
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.8)",
          boxShadow: "0 8px 32px rgba(234, 88, 12, 0.06)",
        }}
      >
        {/* Hidden type field */}
        <input type="hidden" {...register("type")} value={type} />

        {/* Nama Barang */}
        <div>
          <label className={labelCls}>
            Nama Barang <span className="text-red-500">*</span>
          </label>
          <input
            {...register("itemName")}
            placeholder="Contoh: Charger iPhone, Buku Matematika"
            className={inputCls(!!errors.itemName)}
            disabled={isPending || isAtLimit}
          />
          {errors.itemName && (
            <p className="mt-1 text-xs text-red-500">{errors.itemName.message as string}</p>
          )}
        </div>

        {/* Kategori */}
        <div>
          <label className={labelCls}>
            Kategori <span className="text-red-500">*</span>
          </label>
          <select
            {...register("categoryId")}
            className={`${inputCls(!!errors.categoryId)} appearance-none cursor-pointer`}
            disabled={isPending || isAtLimit}
            defaultValue=""
          >
            <option value="" disabled>Pilih kategori barang</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-xs text-red-500">{errors.categoryId.message as string}</p>
          )}
        </div>

        {/* Deskripsi */}
        <div>
          <label className={labelCls}>
            Deskripsi / Ciri-ciri{" "}
            <span className="font-normal text-slate-400 text-xs ml-1">Opsional</span>
          </label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Deskripsikan ciri-ciri khusus barang yang membantu identifikasi, contoh: warna biru, ada stiker kucing, dst."
            className={`${inputCls(!!errors.description)} resize-none`}
            disabled={isPending || isAtLimit}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-500">{errors.description.message as string}</p>
          )}
        </div>

        {/* Lokasi */}
        <div>
          <label className={labelCls}>
            {isLost ? "Lokasi Terakhir Dilihat" : "Lokasi Ditemukan"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            {...register("location")}
            placeholder={isLost ? "Contoh: Ruang Kelas XI-A, Lab Komputer 2" : "Contoh: Kantin Utama, Parkiran Motor"}
            className={inputCls(!!errors.location)}
            disabled={isPending || isAtLimit}
          />
          {errors.location && (
            <p className="mt-1 text-xs text-red-500">{errors.location.message as string}</p>
          )}
        </div>

        {/* Tanggal & Waktu (2 kolom pada desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              {isLost ? "Tanggal Hilang" : "Tanggal Ditemukan"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              {...register("date")}
              type="date"
              max={new Date().toISOString().split("T")[0]}
              className={inputCls(!!errors.date)}
              disabled={isPending || isAtLimit}
            />
            {errors.date && (
              <p className="mt-1 text-xs text-red-500">{errors.date.message as string}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>
              {isLost ? "Waktu Hilang" : "Waktu Ditemukan"}{" "}
              <span className="font-normal text-slate-400 text-xs ml-1">Opsional</span>
            </label>
            <input
              {...register("time")}
              type="time"
              max={maxTime}
              className={inputCls(!!errors.time)}
              disabled={isPending || isAtLimit}
            />
            {isToday && (
              <p className="mt-1 text-[11px] text-slate-400">
                Jika tanggal hari ini, waktu tidak boleh melebihi {maxTime}
              </p>
            )}
            {errors.time && (
              <p className="mt-1 text-xs text-red-500">{errors.time.message as string}</p>
            )}
          </div>
        </div>

        {/* Upload Foto */}
        <div>
          <label className={labelCls}>
            Foto Barang{" "}
            <span className="font-normal text-slate-400 text-xs ml-1">
              Opsional · maks. {MAX_IMAGES} foto · maks. 5MB
            </span>
          </label>

          {/* Thumbnail Previews */}
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {imagePreviews.map((img, idx) => (
                <div key={idx} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt={img.name}
                    className="w-20 h-20 object-cover rounded-xl border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Drop Area */}
          {imagePreviews.length < MAX_IMAGES && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-orange-400 bg-orange-50"
                  : "border-slate-200 hover:border-orange-300 hover:bg-orange-50/30"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                {isDragging ? (
                  <ImageIcon size={20} className="text-orange-500" />
                ) : (
                  <Upload size={20} className="text-orange-400" />
                )}
              </div>
              <p className="text-sm text-slate-600 font-medium">
                {isDragging ? "Lepaskan file di sini" : "Drag & drop atau klik untuk upload"}
              </p>
              <p className="text-xs text-slate-400">
                {imagePreviews.length}/{MAX_IMAGES} foto · PNG, JPG, WEBP · maks. 5MB
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
          />
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 pt-5 flex justify-end gap-3">
          <Link
            href={isLost ? "/dashboard/lost-items" : "/dashboard/found-items"}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isPending || isAtLimit}
            className="px-6 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-orange-200"
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            {isPending ? "Mengirim..." : "Kirim Laporan"}
          </button>
        </div>
      </form>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl flex flex-col items-center gap-4 text-center"
            style={{ animation: "fadeInUp 0.3s ease-out" }}
          >
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Laporan Berhasil Dikirim!</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {isLost
                ? "Laporan Anda sedang menunggu verifikasi admin."
                : "Laporan Anda sedang menunggu verifikasi admin. Harap segera serahkan barang ke Front Office agar laporan dapat diverifikasi."
              }
            </p>
            <button
              onClick={() => router.push("/dashboard/my-reports")}
              className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors cursor-pointer"
            >
              Lihat Riwayat Laporan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
