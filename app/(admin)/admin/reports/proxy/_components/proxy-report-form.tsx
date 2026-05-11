"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createProxyReport, searchUsersForProxy } from "@/lib/actions/admin-proxy-report.actions";
import {
  User, Package, MapPin, Calendar, Clock, FileText,
  ImagePlus, X, Loader2, Tag, Search, CheckCircle,
} from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
}

export default function ProxyReportForm({ categories }: { categories: CategoryItem[] }) {
  const router = useRouter();
  const [type, setType] = useState<"LOST" | "FOUND">("FOUND");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User search
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<{ id: string; name: string; jabatan: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userSearch.trim().length < 2) {
      setUserResults([]);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchUsersForProxy(userSearch.trim());
      setUserResults(results);
      setSearching(false);
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [userSearch]);

  const handleImageAdd = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 3 - imageFiles.length);
    setImageFiles((prev) => [...prev, ...newFiles].slice(0, 3));
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) {
      setError("Pilih user terdaftar terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("type", type);
    formData.set("targetUserId", selectedUser.id);

    formData.delete("images");
    imageFiles.forEach((f) => formData.append("images", f));

    const result = await createProxyReport(formData);
    if (result.success) {
      setSuccess(true);
    } else {
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

  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-8 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Laporan Berhasil Dibuat</h3>
        <p className="text-sm text-slate-500">
          Laporan atas nama <strong>{selectedUser?.name}</strong> sudah dibuat dan otomatis terverifikasi.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/reports")}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors cursor-pointer"
          >
            Ke Daftar Laporan
          </button>
          <button
            type="button"
            onClick={() => { setSuccess(false); setSelectedUser(null); setImageFiles([]); }}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Buat Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">
          {error}
        </div>
      )}

      {/* Step 1: Type */}
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

      {/* Step 2: User Selection */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">2</div>
          <h3 className="text-sm font-bold text-slate-800">Pilih User</h3>
        </div>

        {selectedUser ? (
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">
                {selectedUser.name.substring(0, 2).toUpperCase()}
              </div>
              <p className="text-sm font-semibold text-slate-800">{selectedUser.name}</p>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedUser(null); setUserSearch(""); }}
              className="text-red-500 hover:text-red-700 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-2 px-3 h-10 rounded-xl border border-slate-200 bg-white">
              <Search size={14} className="text-slate-400" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Ketik nama user (min. 2 karakter)..."
                className="flex-1 text-sm bg-transparent outline-none"
              />
              {searching && <Loader2 size={14} className="text-orange-500 animate-spin" />}
            </div>
            {userResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-lg z-50 py-1 max-h-[200px] overflow-y-auto">
                {userResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { setSelectedUser({ id: u.id, name: u.name }); setUserResults([]); setUserSearch(""); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-orange-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{u.name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{u.jabatan.toLowerCase().replace(/_/g, " ")}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 3: Item Details */}
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
              placeholder="Ciri-ciri tambahan..."
              rows={3}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 resize-none"
            />
            <FieldError name="description" />
          </div>
        </div>
      </div>

      {/* Step 4: Images */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">4</div>
          <h3 className="text-sm font-bold text-slate-800">Foto (opsional, maks. 3)</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {imageFiles.map((file, i) => (
            <div key={i} className="w-20 h-20 rounded-xl border border-slate-200 relative overflow-hidden group">
              <img src={URL.createObjectURL(file)} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
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
        disabled={loading || !selectedUser}
        className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <User size={18} />}
        Buat Laporan untuk {selectedUser?.name || "User"}
      </button>
    </form>
  );
}
