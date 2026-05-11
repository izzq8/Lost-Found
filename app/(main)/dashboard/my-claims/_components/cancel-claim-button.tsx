"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { cancelClaim } from "@/lib/actions/claim.actions";

interface CancelClaimButtonProps {
  claimId: string;
  itemName: string;
}

export default function CancelClaimButton({ claimId, itemName }: CancelClaimButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelClaim(claimId);
      if (result.success) {
        setShowConfirm(false);
        router.refresh();
      } else {
        setError(result.error || "Gagal membatalkan klaim.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
        className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
      >
        Batalkan
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div
            className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl flex flex-col items-center gap-4 text-center"
            style={{ animation: "fadeInUp 0.3s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={28} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Batalkan Klaim?</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Apakah Anda yakin ingin membatalkan klaim untuk <strong>&quot;{itemName}&quot;</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            {error && (
              <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg w-full">{error}</p>
            )}
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Tidak
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
