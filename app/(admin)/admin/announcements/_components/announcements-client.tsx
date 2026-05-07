"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Edit, Trash2, X, Loader2, Plus, Upload, ImageIcon, Calendar,
  Clock, Megaphone, Eye, EyeOff,
} from "lucide-react";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/actions/announcement.actions";

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  publishAt: string;
  expiredAt: string;
  creatorName: string;
  status: "active" | "scheduled" | "expired";
  createdAt: string;
}

type ModalMode = "create" | "edit" | null;

const STATUS_STYLES = {
  active: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", label: "Aktif" },
  scheduled: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Terjadwal" },
  expired: { bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200", label: "Expired" },
};

export default function AnnouncementsClient({ announcements }: { announcements: AnnouncementItem[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalMode>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [expiredAt, setExpiredAt] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "scheduled" | "expired">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetModal = () => {
    setModal(null);
    setEditId(null);
    setTitle("");
    setContent("");
    setPublishAt("");
    setExpiredAt("");
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
  };

  const openCreate = () => {
    resetModal();
    setModal("create");
    // Default: publish now, expire in 30 days
    const now = new Date();
    const exp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    setPublishAt(now.toISOString().slice(0, 16));
    setExpiredAt(exp.toISOString().slice(0, 16));
  };

  const openEdit = (a: AnnouncementItem) => {
    resetModal();
    setModal("edit");
    setEditId(a.id);
    setTitle(a.title);
    setContent(a.content);
    setPublishAt(new Date(a.publishAt).toISOString().slice(0, 16));
    setExpiredAt(new Date(a.expiredAt).toISOString().slice(0, 16));
    if (a.imageUrl && a.imageUrl.startsWith("http")) setPreviewUrl(a.imageUrl);
  };

  const handleFileSelect = (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Format gambar harus JPEG, PNG, atau WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 5MB.");
      return;
    }
    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("content", content);
    formData.set("publishAt", publishAt);
    formData.set("expiredAt", expiredAt);
    if (selectedFile) formData.set("image", selectedFile);

    let result;
    if (modal === "create") {
      result = await createAnnouncement(formData);
    } else if (modal === "edit" && editId) {
      formData.set("announcementId", editId);
      result = await updateAnnouncement(formData);
    }

    if (result?.success) {
      resetModal();
      router.refresh();
    } else {
      setError(result?.error || "Terjadi kesalahan.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    const result = await deleteAnnouncement(id);
    if (!result.success) alert(result.error || "Gagal menghapus.");
    setDeleteConfirm(null);
    router.refresh();
    setLoading(false);
  };

  const filtered = filter === "all" ? announcements : announcements.filter((a) => a.status === filter);
  const canSubmit = title.trim().length > 0 && content.trim().length >= 10 && publishAt && expiredAt && !loading;

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(["all", "active", "scheduled", "expired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === f
                  ? "bg-orange-500 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              {f === "all" ? "Semua" : f === "active" ? "Aktif" : f === "scheduled" ? "Terjadwal" : "Expired"}
              <span className="ml-1 opacity-70">
                ({f === "all" ? announcements.length : announcements.filter((a) => a.status === f).length})
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="h-10 flex items-center gap-2 px-5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 shadow-sm transition-colors cursor-pointer"
        >
          <Plus size={16} /> Buat Pengumuman
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
          <Megaphone size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Belum ada pengumuman.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((a) => {
            const s = STATUS_STYLES[a.status];
            return (
              <div
                key={a.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row gap-4"
              >
                {/* Image thumbnail */}
                {a.imageUrl && a.imageUrl.startsWith("http") ? (
                  <div className="w-full sm:w-24 h-20 sm:h-24 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                    <img src={a.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="hidden sm:flex w-24 h-24 rounded-xl bg-slate-50 border border-slate-200 items-center justify-center shrink-0">
                    <ImageIcon size={24} className="text-slate-300" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.bg} ${s.text} ${s.border}`}>
                      {s.label}
                    </span>
                    {a.status === "active" && (
                      <span className="flex items-center gap-1 text-[10px] text-green-600">
                        <Eye size={10} /> Tampil di dashboard
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 truncate">{a.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.content}</p>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(a.publishAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      {" → "}
                      {new Date(a.expiredAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span>oleh {a.creatorName}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(a)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer" title="Edit">
                    <Edit size={16} />
                  </button>
                  {deleteConfirm === a.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(a.id)}
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
                    <button onClick={() => setDeleteConfirm(a.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer" title="Hapus">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-lg font-bold text-slate-800">
                {modal === "create" ? "Buat Pengumuman" : "Edit Pengumuman"}
              </h2>
              <button onClick={resetModal} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Judul</label>
                <input
                  type="text"
                  placeholder="Judul pengumuman"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Konten</label>
                <textarea
                  placeholder="Isi pengumuman (min 10 karakter)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    <Clock size={14} /> Tanggal Publish
                  </label>
                  <input
                    type="datetime-local"
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                    className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    <EyeOff size={14} /> Tanggal Expired
                  </label>
                  <input
                    type="datetime-local"
                    value={expiredAt}
                    onChange={(e) => setExpiredAt(e.target.value)}
                    className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Gambar <span className="text-xs font-normal text-slate-400">(opsional)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-orange-300 hover:bg-orange-50/30 cursor-pointer transition-all"
                >
                  {previewUrl ? (
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-white shadow-sm shrink-0">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-xs">
                        <p className="font-medium text-slate-600">{selectedFile ? selectedFile.name : "Gambar saat ini"}</p>
                        <p className="text-orange-500 font-semibold mt-0.5">Klik untuk ganti</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload size={20} className="text-orange-400" />
                      <p className="text-xs text-slate-500">
                        <span className="text-orange-500 font-semibold">Klik untuk pilih</span> • JPEG, PNG, WebP • Maks 5MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

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
