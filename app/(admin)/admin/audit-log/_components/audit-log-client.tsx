"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  FileText,
  Key,
  Megaphone,
  Search,
  Shield,
  Tag,
  Trash2,
  UserMinus,
  UserPlus,
  XCircle,
} from "lucide-react";
import { MultiSelectDropdown } from "@/components/shared/multi-select-dropdown";
import type { PaginationMeta } from "@/lib/types/pagination";

interface AuditLogItem {
  id: string;
  action: string;
  actorName: string;
  actorJabatan: string | null;
  targetType: string;
  targetId: string | null;
  detail: string;
  createdAt: string;
}

interface AuditActionOption {
  action: string;
  count: number;
}

const ACTION_STYLES: Record<string, { icon: typeof Activity; color: string; bg: string }> = {
  USER_REGISTERED: { icon: UserPlus, color: "text-green-600", bg: "bg-green-50" },
  USER_DEACTIVATED: { icon: UserMinus, color: "text-red-500", bg: "bg-red-50" },
  USER_REACTIVATED: { icon: UserPlus, color: "text-green-600", bg: "bg-green-50" },
  USER_DELETED: { icon: Trash2, color: "text-red-500", bg: "bg-red-50" },
  ADMIN_CREATED: { icon: Shield, color: "text-purple-600", bg: "bg-purple-50" },
  PASSWORD_RESET: { icon: Key, color: "text-amber-600", bg: "bg-amber-50" },
  REPORT_CREATED: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  REPORT_VERIFIED: { icon: Check, color: "text-green-600", bg: "bg-green-50" },
  REPORT_REJECTED: { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  REPORT_EXPIRED: { icon: Clock, color: "text-slate-500", bg: "bg-slate-100" },
  REPORT_DELETED: { icon: Trash2, color: "text-red-500", bg: "bg-red-50" },
  ADMIN_REPORT_DELETED: { icon: Trash2, color: "text-red-500", bg: "bg-red-50" },
  CLAIM_SUBMITTED: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  CLAIM_APPROVED: { icon: Check, color: "text-green-600", bg: "bg-green-50" },
  CLAIM_REJECTED: { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  CLAIM_COMPLETED: { icon: Check, color: "text-green-600", bg: "bg-green-50" },
  ENROLLMENT_CODE_GENERATED: { icon: Key, color: "text-indigo-600", bg: "bg-indigo-50" },
  ENROLLMENT_CODE_DEACTIVATED: { icon: Key, color: "text-slate-500", bg: "bg-slate-100" },
  CATEGORY_CREATED: { icon: Tag, color: "text-blue-600", bg: "bg-blue-50" },
  CATEGORY_UPDATED: { icon: Edit, color: "text-amber-600", bg: "bg-amber-50" },
  CATEGORY_DELETED: { icon: Trash2, color: "text-red-500", bg: "bg-red-50" },
  ANNOUNCEMENT_CREATED: { icon: Megaphone, color: "text-orange-600", bg: "bg-orange-50" },
  ANNOUNCEMENT_UPDATED: { icon: Edit, color: "text-amber-600", bg: "bg-amber-50" },
  ANNOUNCEMENT_DELETED: { icon: Trash2, color: "text-red-500", bg: "bg-red-50" },
};

const ACTION_LABELS: Record<string, string> = {
  USER_REGISTERED: "User Terdaftar",
  USER_DEACTIVATED: "User Dinonaktifkan",
  USER_REACTIVATED: "User Diaktifkan Kembali",
  USER_DELETED: "User Dihapus",
  ADMIN_CREATED: "Admin Dibuat",
  PASSWORD_RESET: "Reset Password",
  REPORT_CREATED: "Laporan Dibuat",
  REPORT_VERIFIED: "Laporan Diverifikasi",
  REPORT_REJECTED: "Laporan Ditolak",
  REPORT_EXPIRED: "Laporan Kedaluwarsa",
  REPORT_DELETED: "Laporan Dihapus",
  ADMIN_REPORT_DELETED: "Laporan Dihapus (Admin)",
  CLAIM_SUBMITTED: "Klaim Diajukan",
  CLAIM_APPROVED: "Klaim Disetujui",
  CLAIM_REJECTED: "Klaim Ditolak",
  CLAIM_COMPLETED: "Klaim Selesai",
  ENROLLMENT_CODE_GENERATED: "Kode Enrollment Dibuat",
  ENROLLMENT_CODE_DEACTIVATED: "Kode Enrollment Dinonaktifkan",
  CATEGORY_CREATED: "Kategori Dibuat",
  CATEGORY_UPDATED: "Kategori Diubah",
  CATEGORY_DELETED: "Kategori Dihapus",
  ANNOUNCEMENT_CREATED: "Pengumuman Dibuat",
  ANNOUNCEMENT_UPDATED: "Pengumuman Diubah",
  ANNOUNCEMENT_DELETED: "Pengumuman Dihapus",
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatJabatan(jabatan: string) {
  return jabatan.replace(/_/g, " ").toLowerCase();
}

export default function AuditLogClient({
  logs,
  actions,
  filters,
  pagination,
}: {
  logs: AuditLogItem[];
  actions: AuditActionOption[];
  filters: { q: string; actions: string[] };
  pagination: PaginationMeta;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q);
  const [selectedActions, setSelectedActions] = useState<string[]>(filters.actions);

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

  const handleActionChange = (values: string[]) => {
    setSelectedActions(values);
    updateParams({ action: values.length > 0 ? values.join(",") : undefined });
  };

  const actionOptions = useMemo(
    () =>
      actions.map((a) => ({
        value: a.action,
        label: formatAction(a.action),
        sublabel: `${a.count} entri`,
      })),
    [actions]
  );

  return (
    <div className={`flex flex-col gap-4 ${isPending ? "opacity-60" : ""}`}>
      <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSearch}>
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari detail, nama aktor, atau aksi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        </div>
      </form>

      <div className="flex flex-col sm:flex-row gap-3">
        <MultiSelectDropdown
          label="Aksi"
          options={actionOptions}
          selected={selectedActions}
          onChange={handleActionChange}
          searchPlaceholder="Cari aksi..."
        />
      </div>

      <p className="text-xs text-slate-400">{pagination.totalItems} entri ditemukan</p>

      {logs.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
          <Activity size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Tidak ada log yang cocok.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Waktu</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Aksi</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Aktor</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const style = ACTION_STYLES[log.action] || { icon: Activity, color: "text-slate-500", bg: "bg-slate-100" };
                  const Icon = style.icon;
                  return (
                    <tr key={log.id} className="border-b border-slate-50 last:border-b-0 hover:bg-orange-50/20 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${style.color} ${style.bg}`}>
                          <Icon size={10} /> {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span className="text-sm font-medium text-slate-700">{log.actorName}</span>
                          {log.actorJabatan && (
                            <span className="ml-1.5 text-[10px] text-slate-400 capitalize">{formatJabatan(log.actorJabatan)}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate" title={log.detail}>
                        {log.detail}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-slate-50">
            {logs.map((log) => {
              const style = ACTION_STYLES[log.action] || { icon: Activity, color: "text-slate-500", bg: "bg-slate-100" };
              const Icon = style.icon;
              return (
                <div key={log.id} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${style.bg}`}>
                      <Icon size={12} className={style.color} />
                    </div>
                    <span className={`text-[10px] font-bold ${style.color}`}>{formatAction(log.action)}</span>
                  </div>
                  <p className="text-sm text-slate-700">{log.detail}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span>{log.actorName}</span>
                    <span>
                      {new Date(log.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
    </div>
  );
}
