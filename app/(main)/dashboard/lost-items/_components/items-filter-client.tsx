"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, Package, PenLine } from "lucide-react";
import Link from "next/link";
import { MultiSelectDropdown } from "@/components/shared/multi-select-dropdown";
import { ItemCard } from "@/components/shared/item-card";
import type { PaginationMeta } from "@/lib/types/pagination";

type TabKey = "all" | "active" | "done";

interface ReportData {
  id: string;
  type: string;
  status: string;
  itemName: string;
  location: string;
  date: string;
  category: { name: string; imageUrl?: string };
  reportImageUrl?: string;
}

interface Props {
  reports: ReportData[];
  categories: { name: string }[];
  counts: { all: number; active: number; done: number };
  filters: { q: string; status: TabKey; categories: string[] };
  pagination: PaginationMeta;
}

export function LostItemsFilterClient({
  reports,
  categories,
  counts,
  filters,
  pagination,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(filters.categories);

  useEffect(() => {
    setSearch(filters.q);
    setSelectedCategories(filters.categories);
  }, [filters.q, filters.categories]);

  const updateParams = (
    updates: Record<string, string | undefined>,
    { resetPage = true }: { resetPage?: boolean } = {}
  ) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (resetPage) next.delete("page");
    const query = next.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParams({ q: search.trim() || undefined });
  };

  const handleTabChange = (tab: TabKey) => {
    updateParams({ status: tab === "all" ? undefined : tab });
  };

  const handleCategoryChange = (values: string[]) => {
    setSelectedCategories(values);
    updateParams({ category: values.length > 0 ? values.join(",") : undefined });
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "Semua", count: counts.all },
    { key: "active", label: "Aktif", count: counts.active },
    { key: "done", label: "Selesai", count: counts.done },
  ];

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.name, label: c.name })),
    [categories]
  );
  const hasFilters =
    Boolean(filters.q) || filters.categories.length > 0 || filters.status !== "all";

  return (
    <>
      {/* Search Bar */}
      <form className="relative" onSubmit={handleSearch}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari barang hilang..."
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
        />
      </form>

      {/* Tabs + Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex bg-slate-100/70 p-1 rounded-xl border border-slate-200/50">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                filters.status === t.key
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
              <span className={`ml-1 text-xs ${filters.status === t.key ? "text-orange-100" : "text-slate-400"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <MultiSelectDropdown
          label="Kategori"
          options={categoryOptions}
          selected={selectedCategories}
          onChange={handleCategoryChange}
          searchPlaceholder="Cari kategori..."
        />
      </div>

      {/* Results */}
      {reports.length === 0 ? (
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
            {hasFilters
              ? "Tidak ada barang yang cocok dengan filter."
              : "Belum ada laporan barang hilang"}
          </p>
          {!hasFilters && (
            <Link
              href="/dashboard/report/lost"
              className="text-orange-600 text-sm font-medium hover:underline flex items-center gap-1"
            >
              <PenLine size={14} /> Buat laporan pertama
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${isPending ? "opacity-60" : ""}`}>
            {reports.map((report) => (
              <ItemCard key={report.id} report={report} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => updateParams({ page: String(pagination.page - 1) }, { resetPage: false })}
                disabled={!pagination.hasPreviousPage}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft size={16} className="text-slate-500" />
              </button>
              <span className="text-sm text-slate-600 font-medium">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => updateParams({ page: String(pagination.page + 1) }, { resetPage: false })}
                disabled={!pagination.hasNextPage}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight size={16} className="text-slate-500" />
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
