"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteReport, resolveReport } from "@/lib/actions/report.actions";
import { Trash2, CheckCircle2, Loader2, AlertTriangle, Pencil } from "lucide-react";
import Link from "next/link";

interface ReportActionsClientProps {
  reportId: string;
  reportStatus: string;
  reportType: "LOST" | "FOUND";
  isOwner: boolean;
  hasActiveFoundMatch: boolean;
  userHasPendingMatch: boolean;
}

export default function ReportActionsClient({
  reportId,
  reportStatus,
  reportType,
  isOwner,
  hasActiveFoundMatch,
  userHasPendingMatch,
}: ReportActionsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);

  if (!isOwner) return null;

  const editHref = reportType === "LOST"
    ? `/dashboard/lost-items/${reportId}/edit`
    : `/dashboard/found-items/${reportId}/edit`;

  const handleDelete = async () => {
    setLoading("delete");
    setError(null);
    const result = await deleteReport(reportId);
    setLoading(null);
    if (result.success) {
      setShowDeleteModal(false);
      router.push(reportType === "LOST" ? "/dashboard/lost-items" : "/dashboard/found-items");
      router.refresh();
    } else {
      setError(result.error ?? "Gagal menghapus.");
    }
  };

  const handleResolve = async () => {
    setLoading("resolve");
    setError(null);
    const result = await resolveReport(reportId);
    setLoading(null);
    if (result.success) {
      setShowResolveModal(false);
      router.refresh();
    } else {
      setError(result.error ?? "Gagal menutup laporan.");
    }
  };

  // Blocked: active FoundMatch
  const isBlocked = hasActiveFoundMatch || userHasPendingMatch;

  return (
    <>
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Tindakan</h3>
        <div className="flex flex-col gap-3">
          {/* PENDING: Edit + Delete */}
          {reportStatus === "PENDING" && (
            <>
              <Link
                href={editHref}
                className="w-full flex items-center justify-center gap-2 h-10 bg-orange-50 text-orange-600 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors border border-orange-200"
              >
                <Pencil size={16} /> Edit Laporan
              </Link>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center justify-center gap-2 h-10 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors border border-red-200 cursor-pointer"
              >
                <Trash2 size={16} /> Hapus Laporan
              </button>
            </>
          )}

          {/* VERIFIED: Edit (limited) + Resolve (only for LOST) */}
          {reportStatus === "VERIFIED" && !isBlocked && (
            <>
              <Link
                href={editHref}
                className="w-full flex items-center justify-center gap-2 h-10 bg-orange-50 text-orange-600 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors border border-orange-200"
              >
                <Pencil size={16} /> Edit Deskripsi & Lokasi
              </Link>
              {reportType === "LOST" && (
                <button
                  type="button"
                  onClick={() => setShowResolveModal(true)}
                  className="w-full flex items-center justify-center gap-2 h-10 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors border border-emerald-200 cursor-pointer"
                >
                  <CheckCircle2 size={16} /> Sudah Ditemukan
                </button>
              )}
            </>
          )}

          {/* Blocked: FoundMatch active */}
          {reportStatus === "VERIFIED" && isBlocked && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center">
              <p className="text-xs text-amber-700 font-medium">
                {userHasPendingMatch
                  ? "Anda sudah mengirim laporan penemuan. Menunggu review admin."
                  : "Ada proses pengembalian yang sedang berjalan."}
              </p>
            </div>
          )}

          {/* Terminal states */}
          {["CLAIMED", "REJECTED", "EXPIRED", "RESOLVED", "AWAITING_PICKUP"].includes(reportStatus) && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Tidak ada tindakan yang tersedia.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Hapus Laporan?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Laporan beserta foto dan komentar akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            {error && <p className="text-xs text-red-600 mb-3 p-2 bg-red-50 rounded-lg">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setError(null); }}
                className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={loading !== null}
                className="flex-1 h-10 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading === "delete" ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Confirmation Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Tandai Sudah Ditemukan?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Laporan akan ditutup dan tidak tampil lagi di daftar publik. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            {error && <p className="text-xs text-red-600 mb-3 p-2 bg-red-50 rounded-lg">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowResolveModal(false); setError(null); }}
                className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleResolve}
                disabled={loading !== null}
                className="flex-1 h-10 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading === "resolve" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Ya, Tandai Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
