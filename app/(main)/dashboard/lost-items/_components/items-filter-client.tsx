"use client";

import { useState, useMemo } from "react";
import { Search, Package, PenLine } from "lucide-react";
import Link from "next/link";
import { MultiSelectDropdown } from "@/components/shared/multi-select-dropdown";
import { ItemCard } from "@/components/shared/item-card";

const ACTIVE_STATUSES = ["PENDING", "VERIFIED", "AWAITING_PICKUP"];
const DONE_STATUSES = ["CLAIMED", "EXPIRED", "REJECTED", "RESOLVED"];

type TabKey = "all" | "active" | "done";

interface ReportData {
  id: string;
  type: string;
  status: string;
  itemName: string;
  location: string;
  date: Date;
  category: { name: string; imageUrl?: string };
  reportImageUrl?: string;
}

interface Props {
  reports: ReportData[];
  categories: { name: string }[];
}

export function LostItemsFilterClient({ reports, categories }: Props) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let result = reports;

    if (tab === "active") result = result.filter((r) => ACTIVE_STATUSES.includes(r.status));
    if (tab === "done") result = result.filter((r) => DONE_STATUSES.includes(r.status));

    if (selectedCategories.length > 0) {
      result = result.filter((r) => selectedCategories.includes(r.category.name));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) => r.itemName.toLowerCase().includes(q) || r.location.toLowerCase().includes(q)
      );
    }

    return result;
  }, [reports, tab, selectedCategories, search]);

  const activeCount = reports.filter((r) => ACTIVE_STATUSES.includes(r.status)).length;
  const doneCount = reports.filter((r) => DONE_STATUSES.includes(r.status)).length;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "Semua", count: reports.length },
    { key: "active", label: "Aktif", count: activeCount },
    { key: "done", label: "Selesai", count: doneCount },
  ];

  const categoryOptions = categories.map((c) => ({ value: c.name, label: c.name }));

  return (
    <>
      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari barang hilang..."
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
        />
      </div>

      {/* Tabs + Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex bg-slate-100/70 p-1 rounded-xl border border-slate-200/50">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                tab === t.key
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
              <span className={`ml-1 text-xs ${tab === t.key ? "text-orange-100" : "text-slate-400"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <MultiSelectDropdown
          label="Kategori"
          options={categoryOptions}
          selected={selectedCategories}
          onChange={setSelectedCategories}
          searchPlaceholder="Cari kategori..."
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center flex flex-col items-center gap-3"
          style={{
            background: "rgba(255,255,255,0.5)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.7)",
          }}
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Package size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-600 font-medium">
            {search || selectedCategories.length > 0 || tab !== "all"
              ? "Tidak ada barang yang cocok dengan filter."
              : "Belum ada laporan barang hilang"}
          </p>
          {!search && selectedCategories.length === 0 && tab === "all" && (
            <Link
              href="/dashboard/report/lost"
              className="text-orange-600 text-sm font-medium hover:underline flex items-center gap-1"
            >
              <PenLine size={14} /> Buat laporan pertama
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((report) => (
            <ItemCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </>
  );
}
