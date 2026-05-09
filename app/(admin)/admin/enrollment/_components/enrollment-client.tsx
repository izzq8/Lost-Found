"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, RefreshCw, XCircle, GraduationCap, BookOpen, Loader2, KeyRound } from "lucide-react";
import { generateEnrollmentCode, deactivateEnrollmentCode } from "@/lib/actions/admin.actions";

interface CodeItem {
  id: string;
  code: string;
  type: string;
  status: string;
  usageCount: number;
  creatorName: string;
  expiredAt: string | null;
  deactivatedAt: string | null;
  createdAt: string;
}

function safeCopy(text: string) {
  try {
    navigator.clipboard.writeText(text).catch(() => {});
  } catch {}
}

// ── CODE CARD COMPONENT ──────────────────────────────────────────────────────

function CodeCard({
  type,
  code,
  onGenerate,
  onDeactivate,
  loading,
}: {
  type: "SISWA" | "GURU";
  code: CodeItem | undefined;
  onGenerate: () => void;
  onDeactivate: (id: string) => void;
  loading: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isSiswa = type === "SISWA";

  const accent = isSiswa
    ? {
        bg: "#FFF7ED",
        border: "#FED7AA",
        label: "#EA580C",
        badgeBg: "#FFF7ED",
        badgeBorder: "#FED7AA",
        badgeText: "#C2410C",
      }
    : {
        bg: "#F5F3FF",
        border: "#DDD6FE",
        label: "#7C3AED",
        badgeBg: "#F5F3FF",
        badgeBorder: "#DDD6FE",
        badgeText: "#6D28D9",
      };

  const Icon = isSiswa ? GraduationCap : BookOpen;

  return (
    <div
      className="flex-1 rounded-2xl p-6 flex flex-col gap-4 min-w-0"
      style={{
        background: accent.bg,
        border: `1.5px solid ${accent.border}`,
        boxShadow: "0 4px 6px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${accent.label}20` }}
        >
          <Icon size={20} style={{ color: accent.label }} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Code Aktif</p>
          <p className="text-[15px] font-bold text-slate-800">Tipe {isSiswa ? "Siswa" : "Guru"}</p>
        </div>
        <span
          className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold"
          style={{
            background: accent.badgeBg,
            border: `1px solid ${accent.badgeBorder}`,
            color: accent.badgeText,
          }}
        >
          {isSiswa ? "Siswa" : "Guru"}
        </span>
      </div>

      {/* Code display */}
      {code ? (
        <>
          <div className="flex items-center gap-2">
            <p className="text-xl sm:text-2xl font-bold text-slate-800 font-mono tracking-wide break-all">
              {code.code}
            </p>
            <button
              onClick={() => {
                safeCopy(code.code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="p-2 rounded-lg hover:bg-white/60 cursor-pointer text-slate-500 shrink-0"
              title="Salin code"
            >
              <Copy size={18} />
            </button>
          </div>
          {copied && <p className="text-xs font-medium text-green-500 -mt-2">Disalin!</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Dibuat: {new Date(code.createdAt).toLocaleDateString("id-ID")}</span>
            <span>Digunakan: {code.usageCount} user</span>
            {code.expiredAt && (
              <span>Berlaku sampai: {new Date(code.expiredAt).toLocaleDateString("id-ID")}</span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-auto">
            <button
              onClick={onGenerate}
              disabled={loading}
              className="h-9 flex items-center justify-center gap-2 px-4 rounded-xl bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Generate Baru
            </button>
            <button
              onClick={() => onDeactivate(code.id)}
              disabled={loading}
              className="h-9 flex items-center justify-center gap-2 px-4 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <XCircle size={14} /> Nonaktifkan
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3 flex-1 justify-center">
          <div className="p-6 bg-white/60 rounded-xl border border-dashed border-slate-300 text-center">
            <KeyRound size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Belum ada code aktif untuk tipe ini.</p>
          </div>
          <button
            onClick={onGenerate}
            disabled={loading}
            className="h-9 flex items-center justify-center gap-2 px-4 rounded-xl bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 cursor-pointer w-fit"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Generate Code
          </button>
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function EnrollmentClient({ codes }: { codes: CodeItem[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const activeSiswa = codes.find((c) => c.type === "SISWA" && c.status === "ACTIVE");
  const activeGuru = codes.find((c) => c.type === "GURU" && c.status === "ACTIVE");
  const history = codes.filter((c) => c.status === "INACTIVE");

  const handleGenerate = async (type: "SISWA" | "GURU") => {
    setLoading(true);
    const result = await generateEnrollmentCode(type);
    if (!result.success) {
      alert(result.error || "Gagal membuat code.");
    }
    router.refresh();
    setLoading(false);
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Yakin ingin menonaktifkan code ini? User yang sudah terdaftar tidak terpengaruh.")) return;
    setLoading(true);
    const result = await deactivateEnrollmentCode(id);
    if (!result.success) {
      alert(result.error || "Gagal menonaktifkan code.");
    }
    router.refresh();
    setLoading(false);
  };

  return (
    <>
      {/* Two code cards */}
      <div className="flex flex-col sm:flex-row gap-4">
        <CodeCard
          type="SISWA"
          code={activeSiswa}
          onGenerate={() => handleGenerate("SISWA")}
          onDeactivate={handleDeactivate}
          loading={loading}
        />
        <CodeCard
          type="GURU"
          code={activeGuru}
          onGenerate={() => handleGenerate("GURU")}
          onDeactivate={handleDeactivate}
          loading={loading}
        />
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">Riwayat Code</h3>
          <p className="text-sm text-slate-500">Code yang sudah tidak aktif</p>
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                {["Code", "Tipe", "Tanggal Dibuat", "Tanggal Nonaktif", "Jumlah Pengguna"].map((h) => (
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
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                    Belum ada riwayat code.
                  </td>
                </tr>
              ) : (
                history.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-800 font-mono font-medium">{c.code}</td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                        style={{
                          background: c.type === "GURU" ? "#F5F3FF" : "#FFF7ED",
                          color: c.type === "GURU" ? "#7C3AED" : "#EA580C",
                          border: `1px solid ${c.type === "GURU" ? "#DDD6FE" : "#FED7AA"}`,
                        }}
                      >
                        {c.type === "SISWA" ? "Siswa" : "Guru"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {c.deactivatedAt ? new Date(c.deactivatedAt).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{c.usageCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden divide-y divide-slate-50">
          {history.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">
              Belum ada riwayat code.
            </div>
          ) : (
            history.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-slate-800 font-mono">{c.code}</span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        background: c.type === "GURU" ? "#F5F3FF" : "#FFF7ED",
                        color: c.type === "GURU" ? "#7C3AED" : "#EA580C",
                        border: `1px solid ${c.type === "GURU" ? "#DDD6FE" : "#FED7AA"}`,
                      }}
                    >
                      {c.type === "SISWA" ? "Siswa" : "Guru"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                    <span>·</span>
                    <span>{c.usageCount} pengguna</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
