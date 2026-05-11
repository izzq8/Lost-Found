"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, AlertTriangle, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { ownerApproveFoundMatch, ownerRejectFoundMatch } from "@/lib/actions/owner-found-match.actions";

interface FoundMatchData {
  id: string;
  finderName: string;
  description: string;
  createdAt: string;
  images: { url: string }[];
}

export default function OwnerFoundMatchActions({ matches }: { matches: FoundMatchData[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleApprove = (matchId: string) => {
    if (!confirm("Yakin ingin menyetujui penemuan ini? Penemu akan diminta menyerahkan barang ke Front Office.")) return;
    setError(null);
    setActionId(matchId);
    startTransition(async () => {
      const result = await ownerApproveFoundMatch(matchId);
      if (!result.success) {
        setError(result.error || "Gagal menyetujui.");
      }
      setActionId(null);
      router.refresh();
    });
  };

  const handleReject = (matchId: string) => {
    setError(null);
    setActionId(matchId);
    startTransition(async () => {
      const result = await ownerRejectFoundMatch(matchId, rejectReason);
      if (!result.success) {
        setError(result.error || "Gagal menolak.");
        setActionId(null);
      } else {
        setRejectId(null);
        setRejectReason("");
        setActionId(null);
        router.refresh();
      }
    });
  };

  if (matches.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm">
      <h3 className="text-sm font-bold text-orange-800 mb-1">
        Seseorang Menemukan Barang Anda!
      </h3>
      <p className="text-xs text-orange-600 mb-4">
        {matches.length} orang melapor menemukan barang ini. Periksa dan setujui/tolak.
      </p>

      {error && (
        <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" /> {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {matches.map((match) => (
          <div key={match.id} className="rounded-xl border border-orange-100 bg-orange-50/40 overflow-hidden">
            {/* Header */}
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === match.id ? null : match.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">
                  {match.finderName.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800">{match.finderName}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(match.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              {expandedId === match.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {/* Expanded Content */}
            {expandedId === match.id && (
              <div className="px-4 pb-4 space-y-3 border-t border-orange-100 pt-3">
                <p className="text-sm text-slate-700 leading-relaxed">{match.description}</p>
                
                {match.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {match.images.map((img, idx) => (
                      <a key={idx} href={img.url} target="_blank" rel="noreferrer" className="block">
                        <img src={img.url} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                      </a>
                    ))}
                  </div>
                )}

                {rejectId === match.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Alasan penolakan (min. 5 karakter)..."
                      className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setRejectId(null); setRejectReason(""); }}
                        className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(match.id)}
                        disabled={isPending || rejectReason.trim().length < 5}
                        className="flex-1 py-2 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {isPending && actionId === match.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                        Tolak
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(match.id)}
                      disabled={isPending}
                      className="flex-1 py-2 text-xs font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isPending && actionId === match.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Setujui
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectId(match.id)}
                      disabled={isPending}
                      className="flex-1 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <X size={12} /> Tolak
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
