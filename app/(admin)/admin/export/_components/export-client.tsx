"use client";

import { useState } from "react";
import { getFilteredReportsForExport } from "@/lib/actions/admin.actions";
import {
  Download, FileText, Table2, Loader2, Search, Filter, Calendar,
} from "lucide-react";

interface ReportRow {
  id: string;
  type: string;
  status: string;
  itemName: string;
  category: string;
  location: string;
  description: string;
  reporterName: string;
  reporterJabatan: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABELS: Record<string, string> = { LOST: "Kehilangan", FOUND: "Penemuan" };
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending", VERIFIED: "Terverifikasi", CLAIMED: "Diklaim",
  REJECTED: "Ditolak", EXPIRED: "Expired",
};

export default function ExportClient() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleFilter = async () => {
    setLoading(true);
    const data = await getFilteredReportsForExport({ dateFrom, dateTo, type, status });
    setReports(data);
    setFetched(true);
    setLoading(false);
  };

  const handleExportExcel = async () => {
    if (reports.length === 0) return;
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const wsData = [
        ["No", "Tipe", "Status", "Nama Barang", "Kategori", "Lokasi", "Deskripsi", "Pelapor", "Jabatan", "Tanggal", "Dibuat", "Terakhir Update"],
        ...reports.map((r, i) => [
          i + 1, TYPE_LABELS[r.type] || r.type, STATUS_LABELS[r.status] || r.status,
          r.itemName, r.category, r.location, r.description,
          r.reporterName, r.reporterJabatan.replace("_", " "),
          r.date, r.createdAt, r.updatedAt,
        ]),
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [{ wch: 4 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, "Laporan");
      XLSX.writeFile(wb, `Laporan_LostFound_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (e) {
      console.error("Excel export error:", e);
    }
    setExporting(false);
  };

  const handleExportPDF = async () => {
    if (reports.length === 0) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("Laporan Kehilangan & Penemuan Barang", 14, 15);
      doc.setFontSize(9);
      doc.text(`SMK Forward Nusantara — Dicetak ${new Date().toLocaleDateString("id-ID")}`, 14, 22);
      doc.setFontSize(8);

      const filterInfo = [
        dateFrom ? `Dari: ${dateFrom}` : "",
        dateTo ? `Sampai: ${dateTo}` : "",
        type !== "all" ? `Tipe: ${TYPE_LABELS[type]}` : "",
        status !== "all" ? `Status: ${STATUS_LABELS[status]}` : "",
      ].filter(Boolean).join(" | ");
      if (filterInfo) doc.text(`Filter: ${filterInfo}`, 14, 28);

      autoTable(doc, {
        startY: filterInfo ? 32 : 26,
        head: [["No", "Tipe", "Status", "Nama Barang", "Kategori", "Lokasi", "Pelapor", "Tanggal"]],
        body: reports.map((r, i) => [
          i + 1,
          TYPE_LABELS[r.type] || r.type,
          STATUS_LABELS[r.status] || r.status,
          r.itemName,
          r.category,
          r.location,
          r.reporterName,
          r.date,
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [255, 247, 237] },
      });

      doc.save(`Laporan_LostFound_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (e) {
      console.error("PDF export error:", e);
    }
    setExporting(false);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-orange-500" />
          <h3 className="text-sm font-bold text-slate-800">Filter Laporan</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Calendar size={12} /> Dari Tanggal
            </label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Calendar size={12} /> Sampai Tanggal
            </label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500">Tipe Laporan</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none cursor-pointer focus:border-orange-500 appearance-none">
              <option value="all">Semua Tipe</option>
              <option value="LOST">Kehilangan</option>
              <option value="FOUND">Penemuan</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none cursor-pointer focus:border-orange-500 appearance-none">
              <option value="all">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Terverifikasi</option>
              <option value="CLAIMED">Diklaim</option>
              <option value="REJECTED">Ditolak</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
          <button
            onClick={handleFilter}
            disabled={loading}
            className="h-10 flex items-center justify-center gap-2 px-5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Tampilkan Data
          </button>
          {fetched && reports.length > 0 && (
            <>
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="h-10 flex items-center justify-center gap-2 px-5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                Export PDF
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exporting}
                className="h-10 flex items-center justify-center gap-2 px-5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Table2 size={16} />}
                Export Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Preview Table */}
      {fetched && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              Preview Data <span className="text-slate-400 font-normal">({reports.length} laporan)</span>
            </p>
          </div>

          {reports.length === 0 ? (
            <div className="p-12 text-center">
              <Download size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Tidak ada data yang cocok dengan filter.</p>
            </div>
          ) : (
            <>
            {/* Desktop Preview Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase">No</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase">Tipe</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase">Status</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase">Nama Barang</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase">Kategori</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase">Lokasi</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase">Pelapor</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-500 text-xs uppercase">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.slice(0, 50).map((r, i) => (
                    <tr key={r.id} className="border-b border-slate-50 last:border-b-0 hover:bg-orange-50/20">
                      <td className="py-2.5 px-4 text-slate-400">{i + 1}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.type === "LOST" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                        }`}>
                          {TYPE_LABELS[r.type] || r.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">{STATUS_LABELS[r.status] || r.status}</td>
                      <td className="py-2.5 px-4 text-slate-700 font-medium max-w-[160px] truncate">{r.itemName}</td>
                      <td className="py-2.5 px-4 text-slate-500">{r.category}</td>
                      <td className="py-2.5 px-4 text-slate-500 max-w-[140px] truncate">{r.location}</td>
                      <td className="py-2.5 px-4 text-slate-600">{r.reporterName}</td>
                      <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reports.length > 50 && (
                <div className="px-5 py-3 text-center text-xs text-slate-400 border-t border-slate-50">
                  Menampilkan 50 dari {reports.length} laporan. Semua data akan diekspor.
                </div>
              )}
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-50">
              {reports.slice(0, 50).map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-800 truncate">{r.itemName}</span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${r.type === "LOST" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                        {TYPE_LABELS[r.type] || r.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{r.reporterName}</span>
                      <span>·</span>
                      <span>{r.date}</span>
                      <span>·</span>
                      <span>{STATUS_LABELS[r.status] || r.status}</span>
                    </div>
                  </div>
                </div>
              ))}
              {reports.length > 50 && (
                <div className="px-5 py-3 text-center text-xs text-slate-400">
                  Menampilkan 50 dari {reports.length} laporan. Semua data akan diekspor.
                </div>
              )}
            </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
