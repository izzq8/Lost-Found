"use client";

import { useState, useMemo } from "react";
import {
  Activity, Search, Filter, UserPlus, UserMinus, Shield, FileText,
  Check, XCircle, Clock, Tag, Key, Megaphone, Trash2, Edit, ChevronLeft, ChevronRight,
} from "lucide-react";

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

const ACTION_STYLES: Record<string, { icon: typeof Activity; color: string; bg: string }> = {
  USER_REGISTERED: { icon: UserPlus, color: "text-green-600", bg: "bg-green-50" },
  USER_DEACTIVATED: { icon: UserMinus, color: "text-red-500", bg: "bg-red-50" },
  USER_REACTIVATED: { icon: UserPlus, color: "text-green-600", bg: "bg-green-50" },
  ADMIN_CREATED: { icon: Shield, color: "text-purple-600", bg: "bg-purple-50" },
  PASSWORD_RESET: { icon: Key, color: "text-amber-600", bg: "bg-amber-50" },
  REPORT_CREATED: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  REPORT_VERIFIED: { icon: Check, color: "text-green-600", bg: "bg-green-50" },
  REPORT_REJECTED: { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  REPORT_EXPIRED: { icon: Clock, color: "text-slate-500", bg: "bg-slate-100" },
  REPORT_DELETED: { icon: Trash2, color: "text-red-500", bg: "bg-red-50" },
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

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const PAGE_SIZE = 20;

export default function AuditLogClient({
  logs,
  uniqueActions,
}: {
  logs: AuditLogItem[];
  uniqueActions: string[];
}) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          log.detail.toLowerCase().includes(q) ||
          log.actorName.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.targetType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, search, actionFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari detail, nama aktor..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="h-10 pl-8 pr-8 rounded-xl border border-slate-200 bg-white text-sm outline-none appearance-none cursor-pointer focus:border-orange-500"
          >
            <option value="all">Semua Aksi</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>{formatAction(a)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-400">{filtered.length} entri ditemukan</p>

      {/* Logs */}
      {paginated.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
          <Activity size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Tidak ada log yang cocok.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
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
                {paginated.map((log) => {
                  const style = ACTION_STYLES[log.action] || { icon: Activity, color: "text-slate-500", bg: "bg-slate-100" };
                  const Icon = style.icon;
                  return (
                    <tr key={log.id} className="border-b border-slate-50 last:border-b-0 hover:bg-orange-50/20 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("id-ID", {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
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
                            <span className="ml-1.5 text-[10px] text-slate-400 capitalize">{log.actorJabatan.replace("_", " ").toLowerCase()}</span>
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

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-50">
            {paginated.map((log) => {
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
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer disabled:cursor-default"
          >
            <ChevronLeft size={16} className="text-slate-500" />
          </button>
          <span className="text-sm text-slate-600 font-medium">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer disabled:cursor-default"
          >
            <ChevronRight size={16} className="text-slate-500" />
          </button>
        </div>
      )}
    </div>
  );
}
