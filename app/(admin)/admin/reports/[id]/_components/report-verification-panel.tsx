"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, Eye, UserCheck, Search, Trash2, Package } from "lucide-react";
import { verifyReport, rejectReport } from "@/lib/actions/report.actions";
import { adminDeleteReport } from "@/lib/actions/admin.actions";
import { adminDirectFoundMatch } from "@/lib/actions/admin-direct-found.actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { PhotoUploadModal } from "@/components/shared/photo-upload-modal";

interface ClaimInfo {
  id: string;
  status: string;
  claimantName: string;
  claimantJabatan: string;
  createdAt: string;
}

interface FoundMatchInfo {
  id: string;
  status: string;
  finderName: string;
  createdAt: string;
}

export default function ReportVerificationPanel({
  reportId,
  reportStatus,
  reportType,
  claims,
  foundMatches = [],
}: {
  reportId: string;
  reportStatus: string;
  reportType: string;
  claims: ClaimInfo[];
  foundMatches?: FoundMatchInfo[];
}) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [directFoundLoading, setDirectFoundLoading] = useState(false);
  const [confirmDirectFound, setConfirmDirectFound] = useState(false);
  const [showDirectFoundPhoto, setShowDirectFoundPhoto] = useState(false);

  const checklistItems = [
    "Data lengkap",
    "Bukan spam",
    "Tidak duplikat",
    ...(reportType === "FOUND" ? ["Barang diterima di front office"] : []),
  ];
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    Object.fromEntries(checklistItems.map((item) => [item, false]))
  );
  const allChecked = checklistItems.every((item) => checkedItems[item]);
  const toggleCheck = (item: string) => {
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    const result = await verifyReport(reportId);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Gagal memverifikasi");
    }
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    setError(null);
    const result = await rejectReport(reportId, reason);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Gagal menolak");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setError(null);
    const result = await adminDeleteReport(reportId);
    if (result.success) {
      router.push("/admin/reports");
    } else {
      setError(result.error || "Gagal menghapus");
      setConfirmDelete(false);
    }
    setDeleteLoading(false);
  };

  const handleDirectFound = async (photoUrl: string) => {
    setDirectFoundLoading(true);
    setError(null);
    const result = await adminDirectFoundMatch(reportId, photoUrl);
    if (result.success) {
      setShowDirectFoundPhoto(false);
      router.refresh();
    } else {
      setError(result.error || "Gagal memproses");
      setShowDirectFoundPhoto(false);
    }
    setDirectFoundLoading(false);
  };

  // ── PENDING → Verification Panel ─────────────────────────────────────
  if (reportStatus === "PENDING") {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Verifikasi Laporan</h3>

        {error && (
          <div className="mb-3 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{error}</div>
        )}

        <div className="flex flex-col gap-2.5 mb-5">
          {checklistItems.map((item) => (
            <label key={item} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={checkedItems[item] || false}
                onChange={() => toggleCheck(item)}
                className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 accent-orange-600"
              />
              <span className="text-sm text-slate-700">{item}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleVerify}
            disabled={loading || !allChecked}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            title={!allChecked ? "Centang semua checklist verifikasi terlebih dahulu" : undefined}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Setujui Laporan
          </button>

          {!rejecting ? (
            <button
              onClick={() => setRejecting(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors cursor-pointer"
            >
              <XCircle size={16} /> Tolak Laporan
            </button>
          ) : (
            <div className="flex flex-col gap-3 mt-2 p-3 bg-red-50 rounded-xl border border-red-100">
              <textarea
                placeholder="Alasan penolakan (wajib)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-lg border border-red-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setRejecting(false); setReason(""); }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading || reason.trim().length < 5}
                  className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Konfirmasi"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Delete */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 size={14} /> Hapus Laporan
            </button>
          ) : (
            <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex flex-col gap-2">
              <p className="text-xs text-red-700 font-medium">Hapus laporan ini secara permanen?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {deleteLoading ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Ya, Hapus"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── VERIFIED → Show claims ────────────────────────────────────────────
  if (reportStatus === "VERIFIED") {
    return (
      <>
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Klaim Masuk</h3>
        {claims.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-500">Belum ada klaim untuk laporan ini</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {claims.map((c) => (
              <div key={c.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.claimantName}</p>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">{c.claimantJabatan.toLowerCase().replace(/_/g, " ")}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <Link
                  href={`/admin/claims/${c.id}`}
                  className="flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  <Eye size={14} /> Detail Klaim
                </Link>
              </div>
            ))}
          </div>
        )}
        {reportType === "FOUND" && (
          <Link
            href={`/admin/claims/manual?reportId=${reportId}`}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors shadow-sm"
          >
            <UserCheck size={16} /> Buat Klaim Manual
          </Link>
        )}

        {/* Found Match section for LOST reports */}
        {reportType === "LOST" && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5">
              <Search size={14} className="text-green-600" />
              Laporan Penemuan
              {foundMatches.length > 0 && (
                <span className="ml-auto bg-green-100 text-green-700 py-0.5 px-2 rounded-full text-[10px] font-bold">
                  {foundMatches.length}
                </span>
              )}
            </h4>
            {foundMatches.length > 0 ? (
              <div className="flex flex-col gap-2">
                {foundMatches.map((fm) => (
                  <Link
                    key={fm.id}
                    href={`/admin/found-matches/${fm.id}`}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-orange-50/50 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700 group-hover:text-orange-600 transition-colors">{fm.finderName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(fm.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <StatusBadge status={fm.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-3">Belum ada laporan penemuan</p>
            )}
            <Link
              href="/admin/found-matches"
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-sm font-medium hover:border-orange-300 hover:text-orange-600 transition-colors"
            >
              <Search size={16} /> Lihat Semua Found Match
            </Link>

            {/* Admin Direct Found Match */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowDirectFoundPhoto(true)}
                disabled={directFoundLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Package size={16} /> Saya Menemukan Barang Ini
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Photo Upload Modal for Direct Found */}
      <PhotoUploadModal
        open={showDirectFoundPhoto}
        title="Foto Dokumentasi Barang"
        description="Unggah foto barang yang Anda temukan sebagai bukti dokumentasi penyerahan."
        confirmLabel="Konfirmasi Ditemukan"
        storageBucket="report-images"
        storagePath={`handover/${reportId}`}
        onConfirm={async (photoUrl) => {
          await handleDirectFound(photoUrl);
        }}
        onCancel={() => setShowDirectFoundPhoto(false)}
      />
    </>
    );
  }

  // ── CLAIMED → Completion info ─────────────────────────────────────────
  if (reportStatus === "CLAIMED") {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="text-center py-4">
          <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">Barang Sudah Diserahkan</h3>
          <p className="text-xs text-slate-500">Proses serah terima telah selesai.</p>
        </div>
      </div>
    );
  }

  // ── Other statuses (REJECTED, EXPIRED, RESOLVED, etc) ──────────────────
  const canDelete = reportStatus === "REJECTED";

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="p-4 rounded-xl bg-slate-50 text-center">
        <p className="text-xs text-slate-500">Status: <StatusBadge status={reportStatus} /></p>
      </div>

      {error && (
        <div className="mt-3 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{error}</div>
      )}

      {canDelete && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 size={14} /> Hapus Laporan
            </button>
          ) : (
            <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex flex-col gap-2">
              <p className="text-xs text-red-700 font-medium">Hapus laporan ini secara permanen?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {deleteLoading ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Ya, Hapus"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

