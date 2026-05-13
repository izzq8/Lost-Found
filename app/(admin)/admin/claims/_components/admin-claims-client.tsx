"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { MultiSelectDropdown } from "@/components/shared/multi-select-dropdown";
import { OptimizedThumbnail } from "@/components/shared/optimized-thumbnail";
import type { PaginationMeta } from "@/lib/types/pagination";

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
  handoverPhotoUrl: string | null;
}

const statusTabs = ["Semua", "PENDING", "APPROVED", "REJECTED", "COMPLETED"];
const tabLabels: Record<string, string> = {
  Semua: "Semua",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

export default function AdminClaimsClient({
  claims,
  counts,
  categories,
  filters,
  pagination,
}: {
  claims: ClaimItem[];
  counts: Record<string, number>;
  categories: { name: string }[];
  filters: { q: string; status: string; categories: string[] };
  pagination: PaginationMeta;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(filters.categories);

  useRealtimeRefresh({
    tables: ["claims"],
    onEvent: () => router.refresh(),
    debounceMs: 1500,
  });

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

  const handleStatusChange = (status: string) => {
    updateParams({ status: status === "Semua" ? undefined : status });
  };

  const handleCategoryChange = (values: string[]) => {
    setSelectedCategories(values);
    updateParams({ category: values.length > 0 ? values.join(",") : undefined });
  };

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.name, label: c.name })),
    [categories]
  );

  return (
    <>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {statusTabs.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={`px-3 py-2.5 whitespace-nowrap cursor-pointer transition-colors ${
              filters.status === s ? "border-b-2 border-orange-600 text-orange-600" : "text-slate-500 hover:text-slate-700"
            }`}
            style={{ fontSize: "14px", fontWeight: filters.status === s ? 600 : 500 }}
          >
            {tabLabels[s]}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
              s === "PENDING" && (counts.PENDING ?? 0) > 0 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"
            }`}>
              {counts[s] || 0}
            </span>
          </button>
        ))}
      </div>

      <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSearch}>
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pengklaim atau nama barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-sm"
          />
        </div>
      </form>
      <div className="flex flex-col sm:flex-row gap-3">
        <MultiSelectDropdown
          label="Kategori"
          options={categoryOptions}
          selected={selectedCategories}
          onChange={handleCategoryChange}
          searchPlaceholder="Cari kategori..."
        />
      </div>

      <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                {["#", "Gambar", "Tanggal", "Pengklaim", "Barang Diklaim", "Kategori", "Status", "Dok. Foto", "Aksi"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                    Tidak ada klaim yang sesuai filter.
                  </td>
                </tr>
              ) : (
                claims.map((c, i) => {
                  const thumbnailUrl = c.imageUrl || null;

                  return (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-orange-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-400">{(pagination.page - 1) * pagination.pageSize + i + 1}</td>
                      <td className="px-4 py-3">
                        <OptimizedThumbnail
                          src={thumbnailUrl}
                          fallbackSrc={c.categoryImageUrl}
                          alt={c.itemName}
                          fallbackAlt={c.category}
                          className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0"
                          sizes="40px"
                        />
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
                        {c.handoverPhotoUrl ? (
                          <a href={c.handoverPhotoUrl} target="_blank" rel="noopener noreferrer" title="Foto Serah Terima">
                            <OptimizedThumbnail
                              src={c.handoverPhotoUrl}
                              alt="Serah Terima"
                              className="relative w-8 h-8 rounded overflow-hidden border border-slate-200 hover:ring-2 hover:ring-orange-300 transition-all"
                              sizes="32px"
                            />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
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
          {claims.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-400">
              Tidak ada klaim yang sesuai filter.
            </div>
          ) : (
            claims.map((c) => {
              const thumbnailUrl = c.imageUrl || null;
              return (
                <Link key={c.id} href={`/admin/claims/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-orange-50/30 transition-colors">
                  <OptimizedThumbnail
                    src={thumbnailUrl}
                    fallbackSrc={c.categoryImageUrl}
                    alt={c.itemName}
                    fallbackAlt={c.category}
                    className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0"
                    sizes="48px"
                  />
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

      {pagination.totalPages > 1 && (
        <div className={`flex items-center justify-center gap-2 pt-1 ${isPending ? "opacity-60" : ""}`}>
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
  );
}
