"use client";

import { useState, useRef } from "react";
import { submitFoundMatch } from "@/lib/actions/found-match.actions";
import { Search, Upload, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

type FoundMatchFormProps = {
  reportId: string;
  reportItemName: string;
};

export function FoundMatchForm({ reportId, reportItemName }: FoundMatchFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const total = [...selectedFiles, ...files].slice(0, 3);
    setSelectedFiles(total);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Remove existing files and add our managed ones
    formData.delete("images");
    selectedFiles.forEach((file) => formData.append("images", file));

    const res = await submitFoundMatch(formData);
    setResult(res);
    setIsSubmitting(false);

    if (res.success) {
      setSelectedFiles([]);
      form.reset();
    }
  };

  if (result?.success) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-green-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-green-800">Berhasil Dikirim!</h3>
            <p className="text-xs text-green-700 mt-1">
              Laporan penemuan Anda untuk &quot;{reportItemName}&quot; sudah dikirim ke admin untuk ditinjau.
              Anda akan mendapat notifikasi hasilnya.
            </p>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-700 font-semibold">
            ⚠️ Penting: Jika laporan Anda disetujui, Anda harus segera menyerahkan barang ke Front Office.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-5 cursor-pointer hover:bg-orange-50/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center shrink-0">
          <Search size={20} className="text-green-700" />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-bold text-slate-800">Saya Menemukan Barang Ini</p>
          <p className="text-xs text-slate-500 mt-0.5">Klik untuk melaporkan bahwa Anda menemukan barang ini</p>
        </div>
        <div className={`w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center transition-transform ${isOpen ? "rotate-45 border-orange-400" : ""}`}>
          <span className={`text-sm font-bold ${isOpen ? "text-orange-500" : "text-slate-400"}`}>+</span>
        </div>
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="p-5 pt-0 border-t border-slate-100 mt-0">
          <input type="hidden" name="reportId" value={reportId} />
          
          <div className="pt-5 space-y-4">
            {/* Error */}
            {result?.error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-600 font-medium">{result.error}</p>
              </div>
            )}

            {/* Description */}
            <div>
              <label htmlFor="found-match-desc" className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Deskripsi Penemuan <span className="text-red-500">*</span>
              </label>
              <textarea
                id="found-match-desc"
                name="description"
                rows={3}
                required
                minLength={10}
                maxLength={500}
                placeholder="Jelaskan dimana dan bagaimana Anda menemukan barang ini..."
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none resize-none transition-all"
              />
              {result?.fieldErrors?.description && (
                <p className="text-xs text-red-500 mt-1">{result.fieldErrors.description[0]}</p>
              )}
            </div>

            {/* Image Upload */}
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Foto Bukti <span className="text-slate-400 font-normal">(opsional, maks 3)</span>
              </label>
              
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="relative group">
                      <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedFiles.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 hover:border-orange-400 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  <Upload size={14} />
                  Tambah Foto
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                name="images"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Mengirim...
                </>
              ) : (
                "Kirim Laporan Penemuan"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
