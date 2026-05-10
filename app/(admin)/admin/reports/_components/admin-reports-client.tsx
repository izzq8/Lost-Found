"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Package, Search } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

interface ReportItem {
  id: string;
  type: string;
  status: string;
  itemName: string;
  category: string;
  categoryImageUrl: string | null;
  imageUrl: string | null;
  location: string;
  date: string;
  createdAt: string;
  reporterName: string;
  reporterJabatan: string;
}

const statusTabs = ["Semua", "PENDING", "VERIFIED", "CLAIMED", "REJECTED", "EXPIRED"];
const tabLabels: Record<string, string> = {
  Semua: "Semua",
  PENDING: "Pending",
  VERIFIED: "Verified",
  CLAIMED: "Claimed",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export default function AdminReportsClient({ reports, pendingCount }: { reports: ReportItem[]; pendingCount: number }) {
  const router = useRouter();
  const [tab, setTab] = useState("Semua");
  const [search, setSearch] = useState("");

  useRealtimeRefresh({
    tables: ["reports"],
    onEvent: () => router.refresh(),
    debounceMs: 1500,
  });

  const filtered = reports
    .filter((r) => tab === "Semua" || r.status === tab)
    .filter(
      (r) =>
        !search ||
        r.itemName.toLowerCase().includes(search.toLowerCase()) ||
        r.reporterName.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <>
      {/* Tabs */}
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama barang atau pelapor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                {["#", "Gambar", "Tanggal", "Pelapor", "Tipe", "Nama Barang", "Kategori", "Status", "Aksi"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                    Tidak ada laporan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => {
                  const thumbnailUrl = r.imageUrl || null;
                  const categoryImg = r.categoryImageUrl && (r.categoryImageUrl.startsWith("http://") || r.categoryImageUrl.startsWith("https://")) ? r.categoryImageUrl : null;

                  return (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-orange-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt={r.itemName} className="w-full h-full object-cover" />
                          ) : categoryImg ? (
                            <img src={categoryImg} alt={r.category} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={18} className="text-slate-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{r.reporterName}</p>
                        <p className="text-xs text-slate-400 capitalize">{r.reporterJabatan.toLowerCase().replace(/_/g, " ")}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            r.type === "LOST" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                          }`}
                        >
                          {r.type === "LOST" ? "Hilang" : "Ditemukan"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-medium">{r.itemName}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{r.category}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/reports/${r.id}`}
                          className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600 inline-flex items-center gap-1 text-sm font-medium transition-colors"
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
              Tidak ada laporan yang sesuai filter.
            </div>
          ) : (
            filtered.map((r) => {
              const thumbnailUrl = r.imageUrl || null;
              const categoryImg = r.categoryImageUrl && (r.categoryImageUrl.startsWith("http://") || r.categoryImageUrl.startsWith("https://")) ? r.categoryImageUrl : null;
              return (
                <Link key={r.id} href={`/admin/reports/${r.id}`} className="flex items-center gap-3 p-4 hover:bg-orange-50/30 transition-colors">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                    {thumbnailUrl ? (
                      <img src={thumbnailUrl} alt={r.itemName} className="w-full h-full object-cover" />
                    ) : categoryImg ? (
                      <img src={categoryImg} alt={r.category} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={20} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-800 truncate">{r.itemName}</span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${r.type === "LOST" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        {r.type === "LOST" ? "Hilang" : "Ditemukan"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{r.reporterName}</span>
                      <span>·</span>
                      <span>{new Date(r.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
