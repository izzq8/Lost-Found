"use client";

import { useState, useRef } from "react";
import { Camera, X, Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { nanoid } from "nanoid";

interface PhotoUploadModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  storageBucket: string;
  storagePath: string;
  onConfirm: (photoUrl: string) => Promise<void>;
  onCancel: () => void;
}

export function PhotoUploadModal({
  open,
  title,
  description,
  confirmLabel,
  storageBucket,
  storagePath,
  onConfirm,
  onCancel,
}: PhotoUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 5 * 1024 * 1024) {
      setError("Ukuran file maksimal 5MB.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("Format file harus JPEG, PNG, atau WebP.");
      return;
    }

    setError(null);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleConfirm = async () => {
    if (!file) {
      setError("Silakan unggah foto terlebih dahulu.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const fileName = `${storagePath}/${Date.now()}-${nanoid(6)}.${ext}`;

      const supabase = createClient();
      const { data, error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(fileName, file, { contentType: file.type, upsert: false });

      if (uploadError || !data) {
        setError("Gagal mengunggah foto. Silakan coba lagi.");
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(data.path);

      await onConfirm(publicUrl);
    } catch {
      setError("Terjadi kesalahan saat mengunggah.");
    }
    setUploading(false);
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-5">{description}</p>

        {/* Photo Preview / Upload Area */}
        {preview ? (
          <div className="relative mb-4">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-56 object-cover rounded-xl border border-slate-200"
            />
            <button
              type="button"
              onClick={() => { setFile(null); setPreview(null); }}
              className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full h-40 mb-4 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-orange-500 hover:border-orange-300 transition-colors cursor-pointer"
          >
            <Camera size={32} />
            <span className="text-sm font-medium">Klik untuk unggah foto</span>
            <span className="text-xs text-slate-400">JPEG, PNG, WebP · Maks. 5MB</span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {error && (
          <p className="text-xs text-red-600 mb-3 font-medium">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={uploading}
            className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={uploading || !file}
            className="flex-1 h-10 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
