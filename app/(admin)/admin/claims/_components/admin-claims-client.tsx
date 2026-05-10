"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Package, Search } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

interface ClaimItem {
  id: string;
  status: string;
  claimantName: string;
  claimantJabatan: string;
  itemName: string;
  category: string;
  imageUrl: string | null;
  categoryImageUrl: string | null;
  createdAt: string;
}

const statusTabs = ["Semua", "PENDING", "APPROVED", "REJECTED", "COMPLETED"];
const tabLabels: Record<string, string> = {
  Semua: "Semua",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

export default function AdminClaimsClient({ claims, pendingCount }: { claims: ClaimItem[]; pendingCount: number }) {
  const router = useRouter();
  const [tab, setTab] = useState("Semua");
  const [search, setSearch] = useState("");

  useRealtimeRefresh({
    tables: ["claims"],
    onEvent: () => router.refresh(),
    debounceMs: 1500,
  });

  const filtered = claims
    .filter((c) => tab === "Semua" || c.status === tab)
    .filter(
      (c) =>
        !search ||
        c.claimantName.toLowerCase().includes(search.toLowerCase()) ||
        c.itemName.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {statusTabs.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-3 py-2.5 whitespace-nowrap cursor-pointer transition-colors ${
              tab === s ? "border-b-2 border-orange-600 text-orange-600" : "text-slate-500 hover:text-slate-700"
            }`}
            style={{ fontSize: "14px", fontWeight: tab === s ? 600 : 500 }}
          >
            {tabLabels[s]}
            {s === "PENDING" && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[11px] font-semibold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari pengklaim atau nama barang..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-sm"
        />
      </div>

      <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                {["#", "Gambar", "Tanggal", "Pengklaim", "Barang Diklaim", "Kategori", "Status", "Aksi"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                    Tidak ada klaim yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => {
                  const thumbnailUrl = c.imageUrl || null;
                  const categoryImg = c.categoryImageUrl && (c.categoryImageUrl.startsWith("http://") || c.categoryImageUrl.startsWith("https://")) ? c.categoryImageUrl : null;

                  return (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-orange-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt={c.itemName} className="w-full h-full object-cover" />
                          ) : categoryImg ? (
                            <img src={categoryImg} alt={c.category} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={18} className="text-slate-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{c.claimantName}</p>
                        <p className="text-xs text-slate-400 capitalize">{c.claimantJabatan.toLowerCase().replace(/_/g, " ")}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-medium">{c.itemName}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{c.category}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/claims/${c.id}`}
                          className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600 inline-flex items-center text-sm font-medium transition-colors"
                        >
                          <Eye size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-400">
              Tidak ada klaim yang sesuai filter.
            </div>
          ) : (
            filtered.map((c) => {
              const thumbnailUrl = c.imageUrl || null;
              const categoryImg = c.categoryImageUrl && (c.categoryImageUrl.startsWith("http://") || c.categoryImageUrl.startsWith("https://")) ? c.categoryImageUrl : null;
              return (
                <Link key={c.id} href={`/admin/claims/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-orange-50/30 transition-colors">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                    {thumbnailUrl ? (
                      <img src={thumbnailUrl} alt={c.itemName} className="w-full h-full object-cover" />
                    ) : categoryImg ? (
                      <img src={categoryImg} alt={c.category} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={20} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{c.itemName}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{c.claimantName}</span>
                      <span>·</span>
                      <span>{new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
