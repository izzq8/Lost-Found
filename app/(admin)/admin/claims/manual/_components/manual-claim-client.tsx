"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createManualClaim } from "@/lib/actions/admin-claim.actions";
import {
  Search, UserCheck, User, Users, Phone, FileText, Loader2,
  Check, Package, MapPin, Tag, Calendar,
} from "lucide-react";

interface ReportItem {
  id: string;
  type: string;
  itemName: string;
  location: string;
  categoryName: string;
  date: string;
}

interface UserItem {
  id: string;
  name: string;
  jabatan: string;
}

export default function ManualClaimClient({
  reports,
  users,
  adminId,
  preSelectedReportId,
}: {
  reports: ReportItem[];
  users: UserItem[];
  adminId: string;
  preSelectedReportId?: string | null;
}) {
  const router = useRouter();

  const [selectedReport, setSelectedReport] = useState<string>(preSelectedReportId || "");
  const [reportSearch, setReportSearch] = useState("");
  const [claimantType, setClaimantType] = useState<"registered" | "guest">("registered");
  const [claimantId, setClaimantId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [description, setDescription] = useState("");
  const [directHandover, setDirectHandover] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const filteredReports = useMemo(() => {
    if (!reportSearch) return reports;
    const q = reportSearch.toLowerCase();
    return reports.filter(
      (r) => r.itemName.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.categoryName.toLowerCase().includes(q)
    );
  }, [reports, reportSearch]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users.filter((u) => u.id !== adminId);
    const q = userSearch.toLowerCase();
    return users.filter((u) => u.id !== adminId && u.name.toLowerCase().includes(q));
  }, [users, userSearch, adminId]);

  const selectedReportData = reports.find((r) => r.id === selectedReport);
  const selectedUserData = users.find((u) => u.id === claimantId);

  const canSubmit =
    selectedReport &&
    description.trim().length >= 5 &&
    (claimantType === "registered" ? !!claimantId : guestName.trim().length >= 2 && guestPhone.trim().length >= 8) &&
    !loading;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("reportId", selectedReport);
    formData.set("claimantType", claimantType);
    formData.set("description", description);
    formData.set("directHandover", directHandover ? "true" : "false");

    if (claimantType === "registered") {
      formData.set("claimantId", claimantId);
    } else {
      formData.set("guestName", guestName);
      formData.set("guestPhone", guestPhone);
    }

    const result = await createManualClaim(formData);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => router.push("/admin/claims"), 1500);
    } else {
      setError(result.error || "Gagal membuat klaim manual.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-12 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Check size={28} className="text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Klaim Manual Berhasil!</h3>
        <p className="text-sm text-slate-500">Mengalihkan ke halaman klaim...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">
          {error}
        </div>
      )}

      {/* Step 1: Select Report */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">1</div>
          <h3 className="text-sm font-bold text-slate-800">Pilih Barang</h3>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari barang..."
            value={reportSearch}
            onChange={(e) => setReportSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            <Package size={24} className="mx-auto mb-2 text-slate-300" />
            Tidak ada barang verified yang tersedia.
          </div>
        ) : (
          <div className="max-h-[240px] overflow-y-auto flex flex-col gap-1.5">
            {filteredReports.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedReport(r.id)}
                className={`w-full p-3 rounded-xl text-left transition-all cursor-pointer ${
                  selectedReport === r.id
                    ? "bg-orange-50 border-2 border-orange-400 shadow-sm"
                    : "bg-slate-50/50 border border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    r.type === "LOST" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                  }`}>
                    {r.type === "LOST" ? "HILANG" : "TEMUAN"}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 truncate">{r.itemName}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-0.5"><MapPin size={10} />{r.location}</span>
                  <span className="flex items-center gap-0.5"><Tag size={10} />{r.categoryName}</span>
                  <span className="flex items-center gap-0.5"><Calendar size={10} />{r.date}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Select Claimant */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">2</div>
          <h3 className="text-sm font-bold text-slate-800">Identitas Pengambil</h3>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => { setClaimantType("registered"); setGuestName(""); setGuestPhone(""); }}
            className={`flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              claimantType === "registered" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Users size={14} /> User Terdaftar
          </button>
          <button
            type="button"
            onClick={() => { setClaimantType("guest"); setClaimantId(""); }}
            className={`flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              claimantType === "guest" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <User size={14} /> Tamu
          </button>
        </div>

        {claimantType === "registered" ? (
          <div>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari user..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="max-h-[160px] overflow-y-auto flex flex-col gap-1">
              {filteredUsers.slice(0, 20).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setClaimantId(u.id)}
                  className={`w-full p-2.5 rounded-lg text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    claimantId === u.id
                      ? "bg-orange-50 border-2 border-orange-400"
                      : "bg-slate-50/50 border border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700">{u.name}</span>
                    <span className="ml-1.5 text-[10px] text-slate-400 capitalize">{u.jabatan.replace("_", " ").toLowerCase()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <User size={12} /> Nama Tamu
              </label>
              <input
                type="text"
                placeholder="Nama lengkap tamu"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Phone size={12} /> No. HP Tamu
              </label>
              <input
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Description */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">3</div>
          <h3 className="text-sm font-bold text-slate-800">Catatan Verifikasi</h3>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <FileText size={12} /> Deskripsi / catatan admin
          </label>
          <textarea
            placeholder="Catatan hasil verifikasi (ciri-ciri yang disebutkan pengambil, bukti kepemilikan, dll.)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="px-3 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 resize-none"
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={directHandover}
              onChange={(e) => setDirectHandover(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-500"
            />
            <span className="text-sm font-medium text-slate-700">Serah terima langsung (barang sudah diserahkan)</span>
          </label>
        </div>
      </div>

      {/* Summary & Submit */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Ringkasan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-4">
          <div className="p-2.5 rounded-lg bg-slate-50">
            <span className="text-slate-400">Barang:</span>{" "}
            <span className="text-slate-700 font-medium">{selectedReportData?.itemName || "—"}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50">
            <span className="text-slate-400">Pengambil:</span>{" "}
            <span className="text-slate-700 font-medium">
              {claimantType === "registered"
                ? selectedUserData?.name || "—"
                : guestName ? `${guestName} (Tamu)` : "—"}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50">
            <span className="text-slate-400">Tipe:</span>{" "}
            <span className="text-slate-700 font-medium">Offline / Manual</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50">
            <span className="text-slate-400">Serah Terima:</span>{" "}
            <span className={`font-medium ${directHandover ? "text-green-600" : "text-amber-600"}`}>
              {directHandover ? "Langsung" : "Belum"}
            </span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
          Proses Klaim Manual
        </button>
      </div>
    </div>
  );
}
