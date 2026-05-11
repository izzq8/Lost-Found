"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveFoundMatch,
  rejectFoundMatch,
  confirmItemReceived,
  completeFoundMatch,
  revokeFoundMatch,
} from "@/lib/actions/admin-found-match.actions";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  User, MapPin, Calendar, FileText, Package, Image as ImageIcon,
  CheckCircle, XCircle, Truck, HandHeart, Loader2, AlertCircle, RotateCcw,
} from "lucide-react";
import { PhotoUploadModal } from "@/components/shared/photo-upload-modal";

interface FoundMatchDetail {
  id: string;
  status: string;
  description: string;
  rejectionReason: string | null;
  adminNote: string | null;
  createdAt: string;
  approvedAt: string | null;
  itemReceivedAt: string | null;
  completedAt: string | null;
  finder: { name: string; jabatan: string; email: string };
  report: {
    id: string;
    itemName: string;
    description: string | null;
    location: string;
    date: string;
    status: string;
    reporterName: string;
    reporterJabatan: string;
    categoryName: string;
    categoryImageUrl: string;
    images: { url: string }[];
  };
  images: { url: string }[];
  handoverPhotoUrl: string | null;
  pickupPhotoUrl: string | null;
}

export default function FoundMatchDetailClient({ match }: { match: FoundMatchDetail }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRevokeSection, setShowRevokeSection] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [showHandoverPhoto, setShowHandoverPhoto] = useState(false);
  const [showPickupPhoto, setShowPickupPhoto] = useState(false);

  const handleAction = async (action: string) => {
    setLoading(action);
    setError(null);

    let result: { success: boolean; error?: string };

    switch (action) {
      case "approve":
        result = await approveFoundMatch(match.id);
        break;
      default:
        result = { success: false, error: "Unknown action" };
    }

    setLoading(null);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error ?? "Terjadi kesalahan.");
    }
  };

  const handleReject = async () => {
    setLoading("reject");
    setError(null);
    const result = await rejectFoundMatch(match.id, rejectReason);
    setLoading(null);
    if (result.success) {
      setShowRejectModal(false);
      router.refresh();
    } else {
      setError(result.error ?? "Gagal menolak.");
    }
  };

  const handleRevoke = async () => {
    setLoading("revoke");
    setError(null);
    const result = await revokeFoundMatch(match.id, revokeReason);
    setLoading(null);
    if (result.success) {
      setShowRevokeSection(false);
      router.refresh();
    } else {
      setError(result.error ?? "Gagal me-revoke.");
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const fmtDateTime = (d: string) =>
    new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
      {/* LEFT: Info */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl">
            <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Deskripsi Penemuan */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileText size={20} className="text-green-500" />
            Deskripsi Penemuan
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed p-4 bg-green-50/50 rounded-xl border border-green-100/50">
            {match.description}
          </p>

          {/* Foto dari penemu */}
          {match.images.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <ImageIcon size={14} className="text-slate-400" /> Foto Bukti dari Penemu
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {match.images.map((img, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-200">
                    <img src={img.url} alt={`Bukti ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info Barang Hilang */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package size={20} className="text-red-500" />
            Detail Barang Hilang
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100/50">
              <Package size={16} className="text-orange-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-500">Nama Barang</p>
                <p className="text-sm font-semibold text-slate-800">{match.report.itemName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100/50">
              <MapPin size={16} className="text-orange-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-500">Lokasi Hilang</p>
                <p className="text-sm font-semibold text-slate-800">{match.report.location}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100/50">
              <Calendar size={16} className="text-orange-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-500">Tanggal Hilang</p>
                <p className="text-sm font-semibold text-slate-800">{fmtDate(match.report.date)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100/50">
              <User size={16} className="text-orange-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-500">Pemilik</p>
                <p className="text-sm font-semibold text-slate-800">{match.report.reporterName}</p>
              </div>
            </div>
          </div>

          {match.report.description && (
            <p className="text-sm text-slate-600 p-3 bg-slate-50 rounded-xl border border-slate-100/50">
              {match.report.description}
            </p>
          )}

          {/* Foto barang asli (admin bisa lihat) */}
          {match.report.images.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <ImageIcon size={14} className="text-slate-400" /> Foto Asli Barang (dari Pelapor)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {match.report.images.map((img, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-200">
                    <img src={img.url} alt={`Barang ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rejection reason */}
        {match.status === "REJECTED" && match.rejectionReason && (
          <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
            <h4 className="text-sm font-bold text-red-800 mb-2">Alasan Penolakan</h4>
            <p className="text-sm text-red-700">{match.rejectionReason}</p>
          </div>
        )}

        {/* Photo Documentation */}
        {(match.handoverPhotoUrl || match.pickupPhotoUrl) && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ImageIcon size={20} className="text-orange-500" />
              Dokumentasi Foto
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {match.handoverPhotoUrl && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">📦 Foto Penyerahan Barang</p>
                  <div className="aspect-video rounded-xl overflow-hidden border border-slate-200">
                    <img src={match.handoverPhotoUrl} alt="Foto penyerahan" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              {match.pickupPhotoUrl && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">🤝 Foto Pengambilan Barang</p>
                  <div className="aspect-video rounded-xl overflow-hidden border border-slate-200">
                    <img src={match.pickupPhotoUrl} alt="Foto pengambilan" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Sidebar */}
      <div className="lg:col-span-1 flex flex-col gap-6 sticky top-24">
        {/* Status & Info Penemu */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Informasi Penemu</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 text-green-700 flex items-center justify-center font-bold">
              {match.finder.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{match.finder.name}</p>
              <p className="text-xs text-slate-500 capitalize">{match.finder.jabatan.toLowerCase().replace(/_/g, " ")}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <p className="text-xs text-slate-500 flex justify-between">
              <span>Dilaporkan:</span>
              <span className="font-medium text-slate-700">{fmtDateTime(match.createdAt)}</span>
            </p>
            {match.approvedAt && (
              <p className="text-xs text-slate-500 flex justify-between">
                <span>Disetujui:</span>
                <span className="font-medium text-green-600">{fmtDateTime(match.approvedAt)}</span>
              </p>
            )}
            {match.itemReceivedAt && (
              <p className="text-xs text-slate-500 flex justify-between">
                <span>Barang Diterima:</span>
                <span className="font-medium text-blue-600">{fmtDateTime(match.itemReceivedAt)}</span>
              </p>
            )}
            {match.completedAt && (
              <p className="text-xs text-slate-500 flex justify-between">
                <span>Selesai:</span>
                <span className="font-medium text-green-600">{fmtDateTime(match.completedAt)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Tindakan</h3>
          <div className="flex flex-col gap-3">
            {match.status === "PENDING" && (
              <>
                <button
                  onClick={() => handleAction("approve")}
                  disabled={loading !== null}
                  className="w-full flex items-center justify-center gap-2 h-10 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {loading === "approve" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Setujui
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={loading !== null}
                  className="w-full flex items-center justify-center gap-2 h-10 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors cursor-pointer border border-red-200 disabled:opacity-60"
                >
                  <XCircle size={16} /> Tolak
                </button>
              </>
            )}

            {match.status === "APPROVED" && (
              <>
                <button
                  onClick={() => setShowHandoverPhoto(true)}
                  disabled={loading !== null}
                  className="w-full flex items-center justify-center gap-2 h-10 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Truck size={16} />
                  Barang Diterima
                </button>

                {/* Revoke section */}
                <div className="border-t border-slate-100 pt-3 mt-1">
                  <button
                    onClick={() => setShowRevokeSection(!showRevokeSection)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs text-red-500 hover:text-red-700 font-medium transition-colors cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    {showRevokeSection ? "Batal Revoke" : "Revoke (Salah Barang?)"}
                  </button>
                  {showRevokeSection && (
                    <div className="mt-2 space-y-2">
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Revoke akan membatalkan persetujuan dan mengembalikan laporan ke status Verified.
                      </p>
                      <textarea
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                        rows={2}
                        placeholder="Alasan revoke (min. 5 karakter)..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none resize-none"
                      />
                      <button
                        onClick={handleRevoke}
                        disabled={loading !== null || revokeReason.trim().length < 5}
                        className="w-full flex items-center justify-center gap-2 h-9 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {loading === "revoke" ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                        Konfirmasi Revoke
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {match.status === "ITEM_RECEIVED" && (
              <button
                onClick={() => setShowPickupPhoto(true)}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-2 h-10 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-green-700 hover:to-emerald-700 transition-all cursor-pointer disabled:opacity-60"
              >
                <HandHeart size={16} />
                Serah Terima Selesai
              </button>
            )}

            {(match.status === "COMPLETED" || match.status === "REJECTED") && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <StatusBadge status={match.status} />
                <p className="text-xs text-slate-500 mt-2">
                  {match.status === "COMPLETED" ? "Proses serah terima telah selesai." : "Laporan penemuan ini telah ditolak."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Tolak Laporan Penemuan</h3>
            <p className="text-sm text-slate-500 mb-4">
              Tuliskan alasan penolakan untuk penemu.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Alasan penolakan (min. 5 karakter)..."
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none resize-none"
            />
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowRejectModal(false); setError(null); }}
                className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={loading !== null || rejectReason.trim().length < 5}
                className="flex-1 h-10 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading === "reject" ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload Modals */}
      <PhotoUploadModal
        open={showHandoverPhoto}
        title="Foto Penyerahan Barang"
        description="Unggah foto sebagai bukti bahwa barang telah diterima di Front Office dari penemu."
        confirmLabel="Konfirmasi Diterima"
        storageBucket="report-images"
        storagePath={`handover/${match.id}`}
        onConfirm={async (photoUrl) => {
          const result = await confirmItemReceived(match.id, photoUrl);
          if (result.success) {
            setShowHandoverPhoto(false);
            router.refresh();
          } else {
            throw new Error(result.error);
          }
        }}
        onCancel={() => setShowHandoverPhoto(false)}
      />

      <PhotoUploadModal
        open={showPickupPhoto}
        title="Foto Pengambilan Barang"
        description="Unggah foto sebagai bukti bahwa barang telah diserahkan ke pemiliknya."
        confirmLabel="Konfirmasi Selesai"
        storageBucket="report-images"
        storagePath={`pickup/${match.id}`}
        onConfirm={async (photoUrl) => {
          const result = await completeFoundMatch(match.id, photoUrl);
          if (result.success) {
            setShowPickupPhoto(false);
            router.refresh();
          } else {
            throw new Error(result.error);
          }
        }}
        onCancel={() => setShowPickupPhoto(false)}
      />
    </div>
  );
}
