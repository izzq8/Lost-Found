"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Copy, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { processPasswordReset } from "@/lib/actions/admin.actions";

interface RequestItem {
  id: string;
  status: string;
  userName: string;
  userEmail: string;
  processorName: string | null;
  processedAt: string | null;
  createdAt: string;
}

function safeCopy(text: string) {
  try {
    navigator.clipboard
      .writeText(text)
      .then(() => {})
      .catch(() => {});
  } catch {}
}

export default function PasswordRequestsClient({ requests }: { requests: RequestItem[] }) {
  const router = useRouter();
  const [modalId, setModalId] = useState<string | null>(null);
  const [generatedPwd, setGeneratedPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const modalRequest = requests.find((r) => r.id === modalId);

  const handleReset = async () => {
    if (!modalId) return;
    setLoading(true);
    setError(null);
    const result = await processPasswordReset(modalId);
    if (result.success && result.newPassword) {
      setGeneratedPwd(result.newPassword);
    } else {
      setError(result.error || "Gagal mereset password.");
    }
    setLoading(false);
  };

  const closeModal = () => {
    setModalId(null);
    setGeneratedPwd("");
    setError(null);
    setCopied(false);
    if (generatedPwd) router.refresh();
  };

  return (
    <>
      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                {["#", "Tanggal", "Nama", "Email", "Status", "Aksi"].map((h) => (
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
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                    Belum ada permintaan reset password.
                  </td>
                </tr>
              ) : (
                requests.map((pr, i) => (
                  <tr key={pr.id} className="border-t border-slate-100 hover:bg-orange-50/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(pr.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{pr.userName}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{pr.userEmail}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={pr.status} />
                    </td>
                    <td className="px-4 py-3">
                      {pr.status === "PENDING" ? (
                        <button
                          onClick={() => {
                            setModalId(pr.id);
                            setGeneratedPwd("");
                            setError(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors cursor-pointer"
                        >
                          Reset Password
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Diproses oleh {pr.processorName}{" "}
                          {pr.processedAt
                            ? `(${new Date(pr.processedAt).toLocaleDateString("id-ID")})`
                            : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden divide-y divide-slate-50">
          {requests.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-400">
              Belum ada permintaan reset password.
            </div>
          ) : (
            requests.map((pr) => (
              <div key={pr.id} className="flex items-center gap-3 p-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold"
                  style={{ background: "#FFEDD5", color: "#C2410C" }}
                >
                  {pr.userName.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 truncate">{pr.userName}</span>
                    <StatusBadge status={pr.status} />
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{pr.userEmail}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(pr.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="shrink-0">
                  {pr.status === "PENDING" ? (
                    <button
                      onClick={() => {
                        setModalId(pr.id);
                        setGeneratedPwd("");
                        setError(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">Selesai</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {modalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Reset Password</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500">User</p>
                <p className="text-sm font-semibold text-slate-800">{modalRequest?.userName}</p>
                <p className="text-xs text-slate-400">{modalRequest?.userEmail}</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>
              )}

              {!generatedPwd ? (
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Generate Password Baru
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium text-green-600">✅ Password baru berhasil di-generate:</p>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <code className="text-base font-bold text-slate-800 font-mono tracking-wide flex-1">
                      {generatedPwd}
                    </code>
                    <button
                      onClick={() => {
                        safeCopy(generatedPwd);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-2 rounded-lg hover:bg-slate-200 cursor-pointer text-slate-500 shrink-0"
                      title="Salin password"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  {copied && <p className="text-xs text-green-500 font-medium">Password disalin!</p>}
                  <p className="text-xs text-slate-400">
                    Berikan password ini ke user secara langsung (offline / WA).
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-4 border-t border-slate-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
