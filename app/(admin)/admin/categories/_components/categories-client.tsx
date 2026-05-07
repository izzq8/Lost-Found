"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, X, Loader2, Plus, Upload, ImageIcon } from "lucide-react";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/admin.actions";

interface CategoryItem {
  id: string;
  name: string;
  imageUrl: string;
  reportCount: number;
  createdAt: string;
}

type ModalMode = "create" | "edit" | null;

// Helper: check if imageUrl is a real uploaded URL (not a seed placeholder)
function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

export default function CategoriesClient({ categories }: { categories: CategoryItem[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalMode>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetModal = () => {
    setModal(null);
    setEditId(null);
    setName("");
    setPreviewUrl(null);
    setSelectedFile(null);
    setExistingImageUrl(null);
    setError(null);
    setDragActive(false);
  };

  const openCreate = () => {
    resetModal();
    setModal("create");
  };

  const openEdit = (cat: CategoryItem) => {
    resetModal();
    setModal("edit");
    setEditId(cat.id);
    setName(cat.name);
    setExistingImageUrl(cat.imageUrl);
    setPreviewUrl(isValidImageUrl(cat.imageUrl) ? cat.imageUrl : null);
  };

  const handleFileSelect = (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Format gambar harus JPEG, PNG, atau WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 2MB.");
      return;
    }
    setError(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name);

    if (modal === "create") {
      if (!selectedFile) {
        setError("Gambar kategori wajib diunggah.");
        setLoading(false);
        return;
      }
      formData.set("image", selectedFile);
      const result = await createCategory(formData);
      if (result.success) {
        resetModal();
        router.refresh();
      } else {
        setError(result.error || "Terjadi kesalahan.");
      }
    } else if (modal === "edit" && editId) {
      formData.set("categoryId", editId);
      if (selectedFile) {
        formData.set("image", selectedFile);
      }
      const result = await updateCategory(formData);
      if (result.success) {
        resetModal();
        router.refresh();
      } else {
        setError(result.error || "Terjadi kesalahan.");
      }
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    const result = await deleteCategory(id);
    if (!result.success) {
      alert(result.error || "Gagal menghapus kategori.");
    }
    setDeleteConfirm(null);
    router.refresh();
    setLoading(false);
  };

  const canSubmit =
    name.trim().length > 0 &&
    (modal === "create" ? !!selectedFile : true) &&
    !loading;

  return (
    <>
      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="h-10 flex items-center gap-2 px-5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 shadow-sm transition-colors cursor-pointer"
        >
          <Plus size={16} /> Tambah Kategori
        </button>
      </div>

      {/* Grid Cards for mobile, Table for desktop */}
      {/* Mobile Cards */}
      <div className="sm:hidden flex flex-col gap-3">
        {categories.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-100 shadow-sm text-center text-sm text-slate-400">
            Belum ada kategori.
          </div>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {isValidImageUrl(c.imageUrl) ? (
                  <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={20} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                <p className="text-xs text-slate-400">{c.reportCount} laporan</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(c)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => {
                    if (c.reportCount > 0) alert("Kategori yang sudah digunakan tidak bisa dihapus.");
                    else setDeleteConfirm(c.id);
                  }}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                {["#", "Ikon", "Nama Kategori", "Jumlah Laporan", "Aksi"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                    Belum ada kategori. Klik &quot;Tambah Kategori&quot; untuk menambahkan.
                  </td>
                </tr>
              ) : (
                categories.map((c, i) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-orange-50/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center">
                        {isValidImageUrl(c.imageUrl) ? (
                          <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={20} className="text-slate-300" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{c.reportCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        {deleteConfirm === c.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={loading}
                              className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 cursor-pointer disabled:opacity-50"
                            >
                              Hapus
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (c.reportCount > 0) {
                                alert("Kategori yang sudah digunakan tidak bisa dihapus.");
                              } else {
                                setDeleteConfirm(c.id);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirm Modal (mobile) */}
      {deleteConfirm && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-800 mb-2">Hapus Kategori?</h3>
            <p className="text-sm text-slate-500 mb-4">Kategori ini akan dihapus beserta ikonnya. Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-10 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={loading}
                className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-lg font-bold text-slate-800">
                {modal === "create" ? "Tambah Kategori" : "Edit Kategori"}
              </h2>
              <button onClick={resetModal} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-5 overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">
                  {error}
                </div>
              )}

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Nama Kategori</label>
                <input
                  type="text"
                  placeholder="Masukkan nama kategori"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
                />
              </div>

              {/* Image Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Gambar / Ikon Kategori
                  {modal === "edit" && <span className="text-xs font-normal text-slate-400 ml-1">(opsional, biarkan kosong jika tidak ingin mengubah)</span>}
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleInputChange}
                  className="hidden"
                />

                {/* Drop Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                    dragActive
                      ? "border-orange-500 bg-orange-50/50"
                      : "border-slate-200 bg-slate-50/50 hover:border-orange-300 hover:bg-orange-50/30"
                  }`}
                >
                  {previewUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-md">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-slate-600">
                          {selectedFile ? selectedFile.name : "Gambar saat ini"}
                        </p>
                        {selectedFile && (
                          <p className="text-xs text-slate-400">
                            {(selectedFile.size / 1024).toFixed(0)} KB
                          </p>
                        )}
                        <p className="text-xs text-orange-500 font-semibold mt-1">Klik untuk ganti</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                        <Upload size={22} className="text-orange-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">
                          Drag & drop atau <span className="text-orange-500">klik untuk pilih</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          JPEG, PNG, atau WebP • Maks 2MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Card */}
              {previewUrl && name.trim() && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Preview</p>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shadow-sm shrink-0">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{name}</p>
                      <p className="text-xs text-slate-400">Ikon ini akan tampil di halaman Barang Hilang / Ditemukan</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 px-6 py-4 border-t border-slate-200 shrink-0">
              <button
                onClick={resetModal}
                className="h-10 px-5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="h-10 flex items-center justify-center gap-2 px-5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {modal === "create" ? "Simpan" : "Perbarui"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
