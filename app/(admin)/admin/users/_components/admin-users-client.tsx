"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ToggleLeft, ToggleRight, Loader2, Trash2 } from "lucide-react";
import { deactivateUser, reactivateUser } from "@/lib/actions/user.actions";
import { adminDeleteUser } from "@/lib/actions/admin.actions";

interface UserItem {
  id: string;
  name: string;
  email: string;
  jabatan: string;
  role: string;
  status: string;
  createdAt: string;
  avatarInitials: string;
}

export default function AdminUsersClient({
  users,
  counts,
  currentUserId,
}: {
  users: UserItem[];
  counts: { active: number; inactive: number };
  currentUserId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"ACTIVE" | "DEACTIVATED">("ACTIVE");
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  const filtered = users
    .filter((u) => u.status === tab)
    .filter(
      (u) =>
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

  const handleToggle = async (userId: string, currentStatus: string) => {
    setLoadingId(userId);
    const result =
      currentStatus === "ACTIVE"
        ? await deactivateUser(userId)
        : await reactivateUser(userId);

    if (!result.success) {
      alert(result.error || "Gagal mengubah status.");
    }
    router.refresh();
    setLoadingId(null);
  };

  const handleDelete = async (userId: string) => {
    setDeleteLoadingId(userId);
    const result = await adminDeleteUser(userId);
    if (!result.success) {
      alert(result.error || "Gagal menghapus user.");
    }
    setDeleteConfirmId(null);
    setDeleteLoadingId(null);
    router.refresh();
  };

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["ACTIVE", "DEACTIVATED"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2.5 cursor-pointer transition-colors ${
              tab === t
                ? "border-b-2 border-orange-600 text-orange-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
            style={{ fontSize: "14px", fontWeight: tab === t ? 600 : 500 }}
          >
            {t === "ACTIVE" ? `Aktif (${counts.active})` : `Nonaktif (${counts.inactive})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama atau email..."
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
                {["#", "Nama", "Email", "Jabatan", "Role", "Tgl Daftar", "Status", "Hapus"].map((h) => (
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                    Tidak ada user yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((u, i) => (
                  <tr key={u.id} className="border-t border-slate-100 hover:bg-orange-50/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                          style={{ background: "#FFEDD5", color: "#C2410C" }}
                        >
                          {u.avatarInitials}
                        </div>
                        <span className="text-sm font-medium text-slate-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 capitalize">
                      {u.jabatan.toLowerCase().replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          u.role === "ADMIN"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {u.role === "ADMIN" ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {loadingId === u.id ? (
                        <Loader2 size={18} className="animate-spin text-slate-400" />
                      ) : tab === "ACTIVE" ? (
                        <button
                          onClick={() => handleToggle(u.id, u.status)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer transition-colors"
                          title="Nonaktifkan"
                        >
                          <ToggleRight size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggle(u.id, u.status)}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 cursor-pointer transition-colors"
                          title="Aktifkan"
                        >
                          <ToggleLeft size={18} />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.id === currentUserId ? (
                        <span className="text-[10px] text-slate-400">—</span>
                      ) : deleteConfirmId === u.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={deleteLoadingId === u.id}
                            className="px-2 py-1 rounded text-[10px] font-semibold bg-red-500 text-white hover:bg-red-600 cursor-pointer disabled:opacity-50"
                          >
                            {deleteLoadingId === u.id ? <Loader2 size={12} className="animate-spin" /> : "Hapus"}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 rounded text-[10px] font-medium text-slate-500 hover:bg-slate-100 cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(u.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 cursor-pointer transition-colors"
                          title="Hapus User"
                        >
                          <Trash2 size={16} />
                        </button>
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
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-400">
              Tidak ada user yang sesuai filter.
            </div>
          ) : (
            filtered.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold"
                  style={{ background: "#FFEDD5", color: "#C2410C" }}
                >
                  {u.avatarInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 truncate">{u.name}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${u.role === "ADMIN" ? "bg-orange-50 text-orange-600" : "bg-slate-100 text-slate-500"}`}>
                      {u.role === "ADMIN" ? "Admin" : "User"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{u.email}</p>
                  <p className="text-xs text-slate-400 capitalize">{u.jabatan.toLowerCase().replace(/_/g, " ")}</p>
                </div>
                <div className="shrink-0">
                  {loadingId === u.id ? (
                    <Loader2 size={18} className="animate-spin text-slate-400" />
                  ) : tab === "ACTIVE" ? (
                    <button onClick={() => handleToggle(u.id, u.status)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer" title="Nonaktifkan">
                      <ToggleRight size={18} />
                    </button>
                  ) : (
                    <button onClick={() => handleToggle(u.id, u.status)} className="p-2 rounded-lg hover:bg-green-50 text-green-500 cursor-pointer" title="Aktifkan">
                      <ToggleLeft size={18} />
                    </button>
                  )}
                  {u.id !== currentUserId && (
                    deleteConfirmId === u.id ? (
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={deleteLoadingId === u.id}
                          className="px-2 py-1 rounded text-[10px] font-semibold bg-red-500 text-white cursor-pointer disabled:opacity-50"
                        >
                          {deleteLoadingId === u.id ? <Loader2 size={12} className="animate-spin" /> : "Hapus"}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 rounded text-[10px] text-slate-500 cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(u.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-400 cursor-pointer mt-1"
                        title="Hapus User"
                      >
                        <Trash2 size={16} />
                      </button>
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
