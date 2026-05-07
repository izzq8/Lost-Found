"use client";

import { useRef, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  reportSchema,
  editReportLimitedSchema,
  ReportFormValues,
  EditReportLimitedValues,
  MAX_IMAGES,
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/validations/report.schema";
import { editReport } from "@/lib/actions/report.actions";
import { PageHero } from "@/components/shared/page-hero";
import { PenLine, Upload, X, Loader2, ArrowLeft, Lock, ImageIcon } from "lucide-react";

interface ExistingImage {
  id: string;
  url: string;
  fileName: string;
}

interface NewImagePreview {
  file: File;
  previewUrl: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface EditReportFormClientProps {
  report: {
    id: string;
    type: "LOST" | "FOUND";
    status: string;
    itemName: string;
    categoryId: string;
    description: string;
    location: string;
    date: string;
    time: string;
    images: ExistingImage[];
  };
  categories: Category[];
  backHref: string;
}

export default function EditReportFormClient({
  report,
  categories,
  backHref,
}: EditReportFormClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isPending_ = report.status === "PENDING";
  const isLimited = report.status === "VERIFIED";
  const isLost = report.type === "LOST";

  // Existing images management
  const [keptImages, setKeptImages] = useState<ExistingImage[]>(report.images);
  const [newPreviews, setNewPreviews] = useState<NewImagePreview[]>([]);

  // Form setup — different schema based on status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    resolver: zodResolver(isPending_ ? reportSchema : editReportLimitedSchema) as any,
    defaultValues: isPending_
      ? {
          type: report.type,
          itemName: report.itemName,
          categoryId: report.categoryId,
          description: report.description,
          location: report.location,
          date: report.date,
          time: report.time,
        }
      : {
          description: report.description,
          location: report.location,
        },
  });

  const { register, handleSubmit, formState: { errors } } = form;

  const totalImageCount = keptImages.length + newPreviews.length;

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = MAX_IMAGES - totalImageCount;
    const toAdd = fileArray.slice(0, remaining);

    const previews: NewImagePreview[] = [];
    for (const file of toAdd) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setServerError(`File "${file.name}" melebihi 5MB.`);
        continue;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setServerError(`Format "${file.name}" tidak didukung.`);
        continue;
      }
      previews.push({ file, previewUrl: URL.createObjectURL(file), name: file.name });
    }

    setNewPreviews((prev) => [...prev, ...previews]);
    setServerError(null);
  }, [totalImageCount]);

  const removeKeptImage = (idx: number) => setKeptImages((prev) => prev.filter((_, i) => i !== idx));
  const removeNewImage = (idx: number) => {
    setNewPreviews((prev) => {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = (data: any) => {
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();

      if (isPending_) {
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            formData.append(key, String(value));
          }
        });
        formData.set("keepImageIds", keptImages.map((img) => img.id).join(","));
        newPreviews.forEach((img) => formData.append("images", img.file));
      } else {
        formData.set("description", data.description ?? "");
        formData.set("location", data.location);
      }

      const result = await editReport(report.id, formData);
      if (result.success) {
        router.push(backHref);
        router.refresh();
      } else {
        setServerError(result.error ?? "Gagal menyimpan.");
      }
    });
  };

  const inputCls = (hasError?: boolean) =>
    `w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 bg-white
    ${hasError
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
    }`;

  const labelCls = "block text-sm font-semibold text-slate-700 mb-1.5";
  const disabledInputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-100 text-sm text-slate-400 bg-slate-50 cursor-not-allowed";

  return (
    <div className="flex flex-col gap-5 max-w-[640px] mx-auto">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-slate-500 hover:text-orange-600 transition-colors w-fit text-sm font-medium cursor-pointer"
      >
        <ArrowLeft size={16} /> Kembali
      </button>

      <PageHero
        variant="compact"
        icon={PenLine}
        title={`Edit Laporan${isLimited ? " (Terbatas)" : ""}`}
        subtitle={
          isLimited
            ? "Anda hanya dapat mengubah deskripsi dan lokasi pada laporan yang sudah diverifikasi"
            : "Ubah detail laporan Anda sebelum diverifikasi admin"
        }
      />

      {isLimited && (
        <div className="px-4 py-3 rounded-xl flex items-start gap-2.5 border bg-amber-50 border-amber-200 text-amber-700 text-sm">
          <Lock size={16} className="shrink-0 mt-0.5" />
          <span>
            Laporan sudah diverifikasi. Hanya <strong>deskripsi</strong> dan <strong>lokasi</strong> yang dapat diubah.
          </span>
        </div>
      )}

      {serverError && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <X size={16} className="shrink-0 mt-0.5" />
          {serverError}
        </div>
      )}

      <form
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
        {isPending_ && <input type="hidden" {...register("type")} value={report.type} />}

        {/* Nama Barang */}
        <div>
          <label className={labelCls}>
            Nama Barang {isPending_ && <span className="text-red-500">*</span>}
            {isLimited && <Lock size={12} className="inline ml-1 text-slate-400" />}
          </label>
          {isPending_ ? (
            <>
              <input {...register("itemName")} className={inputCls(!!errors.itemName)} disabled={isPending} />
              {errors.itemName && <p className="mt-1 text-xs text-red-500">{errors.itemName.message as string}</p>}
            </>
          ) : (
            <div className={disabledInputCls}>{report.itemName}</div>
          )}
        </div>

        {/* Kategori */}
        <div>
          <label className={labelCls}>
            Kategori {isPending_ && <span className="text-red-500">*</span>}
            {isLimited && <Lock size={12} className="inline ml-1 text-slate-400" />}
          </label>
          {isPending_ ? (
            <>
              <select {...register("categoryId")} className={`${inputCls(!!errors.categoryId)} appearance-none cursor-pointer`} disabled={isPending}>
                <option value="" disabled>Pilih kategori</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.categoryId && <p className="mt-1 text-xs text-red-500">{errors.categoryId.message as string}</p>}
            </>
          ) : (
            <div className={disabledInputCls}>
              {categories.find((c) => c.id === report.categoryId)?.name ?? "—"}
            </div>
          )}
        </div>

        {/* Deskripsi */}
        <div>
          <label className={labelCls}>
            Deskripsi / Ciri-ciri <span className="font-normal text-slate-400 text-xs ml-1">Opsional</span>
          </label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Deskripsikan ciri-ciri barang..."
            className={`${inputCls(!!errors.description)} resize-none`}
            disabled={isPending}
          />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message as string}</p>}
        </div>

        {/* Lokasi */}
        <div>
          <label className={labelCls}>
            {isLost ? "Lokasi Terakhir Dilihat" : "Lokasi Ditemukan"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            {...register("location")}
            placeholder="Contoh: Ruang Kelas XI-A"
            className={inputCls(!!errors.location)}
            disabled={isPending}
          />
          {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location.message as string}</p>}
        </div>

        {/* Tanggal & Waktu (PENDING only) */}
        {isPending_ && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                {isLost ? "Tanggal Hilang" : "Tanggal Ditemukan"} <span className="text-red-500">*</span>
              </label>
              <input
                {...register("date")}
                type="date"
                max={new Date().toISOString().split("T")[0]}
                className={inputCls(!!errors.date)}
                disabled={isPending}
              />
              {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date.message as string}</p>}
            </div>
            <div>
              <label className={labelCls}>
                {isLost ? "Waktu Hilang" : "Waktu Ditemukan"}{" "}
                <span className="font-normal text-slate-400 text-xs ml-1">Opsional</span>
              </label>
              <input {...register("time")} type="time" className={inputCls(!!errors.time)} disabled={isPending} />
              {errors.time && <p className="mt-1 text-xs text-red-500">{errors.time.message as string}</p>}
            </div>
          </div>
        )}
        {isLimited && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tanggal <Lock size={12} className="inline ml-1 text-slate-400" /></label>
              <div className={disabledInputCls}>
                {new Date(report.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
            <div>
              <label className={labelCls}>Waktu <Lock size={12} className="inline ml-1 text-slate-400" /></label>
              <div className={disabledInputCls}>{report.time || "—"}</div>
            </div>
          </div>
        )}

        {/* Foto (PENDING only — full management) */}
        {isPending_ && (
          <div>
            <label className={labelCls}>
              Foto Barang{" "}
              <span className="font-normal text-slate-400 text-xs ml-1">maks. {MAX_IMAGES} foto · 5MB</span>
            </label>

            {/* Existing images */}
            {(keptImages.length > 0 || newPreviews.length > 0) && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {keptImages.map((img, idx) => (
                  <div key={img.id} className="relative group">
                    <img src={img.url} alt={`Existing ${idx}`} className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => removeKeptImage(idx)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {newPreviews.map((img, idx) => (
                  <div key={`new-${idx}`} className="relative group">
                    <img src={img.previewUrl} alt={img.name} className="w-20 h-20 object-cover rounded-xl border border-orange-200" />
                    <button
                      type="button"
                      onClick={() => removeNewImage(idx)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {totalImageCount < MAX_IMAGES && (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 ${
                  isDragging ? "border-orange-400 bg-orange-50" : "border-slate-200 hover:border-orange-300 hover:bg-orange-50/30"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                  {isDragging ? <ImageIcon size={20} className="text-orange-500" /> : <Upload size={20} className="text-orange-400" />}
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  {isDragging ? "Lepaskan file di sini" : "Drag & drop atau klik untuk upload"}
                </p>
                <p className="text-xs text-slate-400">{totalImageCount}/{MAX_IMAGES} foto</p>
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
        )}
        {isLimited && report.images.length > 0 && (
          <div>
            <label className={labelCls}>Foto <Lock size={12} className="inline ml-1 text-slate-400" /></label>
            <div className="flex gap-2 flex-wrap">
              {report.images.map((img, idx) => (
                <img key={img.id} src={img.url} alt={`Photo ${idx}`} className="w-20 h-20 object-cover rounded-xl border border-slate-200 opacity-60" />
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">Foto tidak dapat diubah pada laporan yang sudah diverifikasi.</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-100 pt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-orange-200 cursor-pointer"
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            {isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
