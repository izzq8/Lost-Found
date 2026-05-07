"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Package, Search } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";

interface FoundMatchItem {
  id: string;
  status: string;
  finderName: string;
  finderJabatan: string;
  itemName: string;
  ownerName: string;
  category: string;
  reportImageUrl: string | null;
  matchImageUrl: string | null;
  categoryImageUrl: string | null;
  description: string;
  createdAt: string;
}

const statusTabs = ["Semua", "PENDING", "APPROVED", "ITEM_RECEIVED", "COMPLETED", "REJECTED"];
const tabLabels: Record<string, string> = {
  Semua: "Semua",
  PENDING: "Pending",
  APPROVED: "Approved",
  ITEM_RECEIVED: "Diterima",
  COMPLETED: "Selesai",
  REJECTED: "Ditolak",
};

export default function AdminFoundMatchesClient({ matches, pendingCount }: { matches: FoundMatchItem[]; pendingCount: number }) {
  const [tab, setTab] = useState("Semua");
  const [search, setSearch] = useState("");

  const filtered = matches
    .filter((m) => tab === "Semua" || m.status === tab)
    .filter(
      (m) =>
        !search ||
        m.finderName.toLowerCase().includes(search.toLowerCase()) ||
        m.itemName.toLowerCase().includes(search.toLowerCase()) ||
        m.ownerName.toLowerCase().includes(search.toLowerCase())
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
          placeholder="Cari penemu, pemilik, atau nama barang..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-sm"
        />
      </div>

      <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                {["#", "Gambar", "Tanggal", "Penemu", "Barang Hilang", "Pemilik", "Status", "Aksi"].map((h) => (
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
                    Tidak ada found match yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((m, i) => {
                  const thumbnailUrl = m.matchImageUrl || m.reportImageUrl || null;
                  const categoryImg = m.categoryImageUrl && (m.categoryImageUrl.startsWith("http://") || m.categoryImageUrl.startsWith("https://")) ? m.categoryImageUrl : null;

                  return (
                    <tr key={m.id} className="border-t border-slate-100 hover:bg-orange-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt={m.itemName} className="w-full h-full object-cover" />
                          ) : categoryImg ? (
                            <img src={categoryImg} alt={m.category} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={18} className="text-slate-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{m.finderName}</p>
                        <p className="text-xs text-slate-400 capitalize">{m.finderJabatan.toLowerCase().replace(/_/g, " ")}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-medium">{m.itemName}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{m.ownerName}</td>
                      <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/found-matches/${m.id}`}
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
      </div>
    </>
  );
}
