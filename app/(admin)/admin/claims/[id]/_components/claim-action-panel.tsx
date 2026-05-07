"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, PackageCheck } from "lucide-react";
import { approveClaim, rejectClaim, completeClaim } from "@/lib/actions/admin-claim.actions";

export default function ClaimActionPanel({ claimId, claimStatus }: { claimId: string; claimStatus: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: "approve" | "reject" | "complete") => {
    setLoading(true);
    setError(null);
    let result;
    if (action === "approve") result = await approveClaim(claimId);
    else if (action === "reject") result = await rejectClaim(claimId, reason);
    else result = await completeClaim(claimId);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Gagal memproses klaim.");
    }
    setLoading(false);
  };

  // ── PENDING ───────────────────────────────────────────────────────────
  if (claimStatus === "PENDING") {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Proses Klaim</h3>

        {error && <div className="mb-3 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{error}</div>}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleAction("approve")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Setujui Klaim
          </button>

          {!rejecting ? (
            <button
              onClick={() => setRejecting(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors cursor-pointer"
            >
              <XCircle size={16} /> Tolak Klaim
            </button>
          ) : (
            <div className="flex flex-col gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
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
                  onClick={() => handleAction("reject")}
                  disabled={loading || reason.trim().length < 5}
                  className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Konfirmasi"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── APPROVED → Complete ───────────────────────────────────────────────
  if (claimStatus === "APPROVED") {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Serah Terima</h3>
        <p className="text-xs text-slate-500 mb-4">
          Klaim telah disetujui. Klik tombol di bawah setelah barang diserahkan ke pemiliknya.
        </p>

        {error && <div className="mb-3 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{error}</div>}

        <button
          onClick={() => handleAction("complete")}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
          Serah Terima Selesai
        </button>
      </div>
    );
  }

  // ── COMPLETED ─────────────────────────────────────────────────────────
  if (claimStatus === "COMPLETED") {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center">
        <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800 mb-1">Selesai</h3>
        <p className="text-xs text-slate-500">Barang telah diserahkan ke pemiliknya.</p>
      </div>
    );
  }

  // ── REJECTED ──────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center">
      <XCircle size={32} className="text-red-400 mx-auto mb-2" />
      <h3 className="text-sm font-bold text-slate-800 mb-1">Klaim Ditolak</h3>
      <p className="text-xs text-slate-500">Klaim ini telah ditolak oleh admin.</p>
    </div>
  );
}
