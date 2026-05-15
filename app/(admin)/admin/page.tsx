import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  LayoutDashboard, Users, FileText, ClipboardList,
  CheckCircle, Activity, ArrowRight, AlertCircle, TrendingUp
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AdminDashboardChartsLazy from "./_components/admin-dashboard-charts-lazy";
export const metadata = { title: "Dashboard Admin — LostFound SMKFN" };

export default async function AdminDashboardPage() {
  const { profile } = await requireAdmin();

  // ── DATA FETCHING ──────────────────────────────────────────────────────
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    activeUsers,
    reportsThisMonth,
    claimedThisMonth,
    totalActiveReports,
    pendingReports,
    pendingClaims,
    recentReports,
    recentLogs,
    // For chart: reports by month (last 6 months)
    allReportsForChart,
    statusDistribution,
  ] = await Promise.all([
    prisma.profile.count({ where: { status: "ACTIVE" } }),
    prisma.report.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.report.count({ where: { status: "CLAIMED", updatedAt: { gte: startOfMonth } } }),
    prisma.report.count({ where: { status: { notIn: ["EXPIRED", "REJECTED"] } } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.claim.count({ where: { status: "PENDING" } }),
    prisma.report.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        itemName: true,
        createdAt: true,
        reporter: { select: { name: true, jabatan: true } },
      },
    }),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
    // Last 6 months reports for chart
    prisma.report.findMany({
      where: {
        createdAt: { gte: chartStart },
      },
      select: { type: true, createdAt: true },
    }),
    // Status distribution
    prisma.report.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const completionRate = totalActiveReports > 0 ? Math.round((claimedThisMonth / totalActiveReports) * 100) : 0;

  // ── CHART DATA PREP ────────────────────────────────────────────────────
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const monthlyData: { month: string; hilang: number; ditemukan: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthReports = allReportsForChart.filter(
      (r) => `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, "0")}` === monthKey
    );
    monthlyData.push({
      month: monthNames[d.getMonth()],
      hilang: monthReports.filter((r) => r.type === "LOST").length,
      ditemukan: monthReports.filter((r) => r.type === "FOUND").length,
    });
  }

  const statusData = statusDistribution.map((s) => ({
    name: s.status,
    value: s._count._all,
  }));

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHero variant="large" icon={LayoutDashboard} title="Dashboard Admin" subtitle={`Selamat datang kembali, ${profile.name}!`}>
        <Link
          href="/admin/reports"
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all group"
        >
          <FileText size={16} className="text-orange-600" strokeWidth={2.5} />
          <span className="text-sm font-bold text-slate-800">Tinjau Laporan</span>
        </Link>
        {/* Fitur Pengumuman di-disable sementara (Deferred) sebagai saran pengembangan ke depan */}
      </PageHero>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Total User Aktif" value={activeUsers} subtext="Dari seluruh civitas sekolah" />
        <StatCard icon={FileText} label="Laporan Bulan Ini" value={reportsThisMonth} subtext="Total barang hilang & ditemukan" />
        <StatCard icon={CheckCircle} label="Diklaim Bulan Ini" value={claimedThisMonth} subtext="Barang berhasil dikembalikan" />
        <StatCard icon={Activity} label="Penyelesaian" value={`${completionRate}%`} subtext="Rasio laporan terselesaikan" />
      </div>

      {/* Action Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <AlertCircle size={18} className="text-orange-500" />
          <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">Menunggu Tindakan</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ActionCard icon={FileText} count={pendingReports} label="Laporan Menunggu Verifikasi" href="/admin/reports" />
          <ActionCard icon={ClipboardList} count={pendingClaims} label="Klaim Menunggu Review" href="/admin/claims" />
        </div>
      </div>

      {/* Charts */}
      <AdminDashboardChartsLazy monthlyData={monthlyData} statusData={statusData} />

      {/* Bottom: Table + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Reports */}
        <div className="xl:col-span-2 bg-white/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/60 shadow-sm flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">Laporan Terbaru</h3>
              <p className="text-sm text-slate-500">5 laporan terakhir yang masuk</p>
            </div>
            <Link href="/admin/reports" className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-full text-orange-600 hover:bg-orange-50 hover:shadow-sm transition-all text-sm font-semibold border border-orange-100">
              Lihat Semua <ArrowRight size={14} />
            </Link>
          </div>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto flex-1 p-2">
            <table className="w-full text-left">
              <thead>
                <tr>
                  {["Tanggal", "Pelapor", "Tipe", "Nama Barang", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentReports.map((r) => (
                  <tr key={r.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {r.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{r.reporter.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${r.type === "LOST" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        {r.type === "LOST" ? "Hilang" : "Ditemukan"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">{r.itemName}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-50 flex-1">
            {recentReports.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 truncate">{r.itemName}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${r.type === "LOST" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                      {r.type === "LOST" ? "Hilang" : "Ditemukan"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{r.reporter.name}</span>
                    <span>·</span>
                    <span>{r.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-800">Aktivitas Sistem</h3>
              <p className="text-sm text-slate-500">Log tindakan terakhir</p>
            </div>
            <Link href="/admin/audit-log" className="p-2 bg-white rounded-full text-orange-600 hover:bg-orange-50 hover:shadow-sm transition-all border border-orange-100">
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="flex flex-col gap-5 flex-1 relative">
            <div className="absolute left-2.5 top-3 bottom-3 w-[2px] bg-orange-100" />
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 relative z-10">
                <div className="w-5 h-5 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgba(255,255,255,0.8)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-slate-700 leading-snug">
                    <span className="font-bold text-slate-800">{log.actor?.name ?? "Sistem"}</span>{" "}
                    {log.action.toLowerCase().replace(/_/g, " ")}
                  </p>
                  <p className="text-xs font-medium text-slate-400 mt-1">
                    {log.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}{" "}
                    {log.createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            {recentLogs.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Belum ada aktivitas tercatat</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SUB-COMPONENTS ─────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, subtext }: { icon: LucideIcon; label: string; value: string | number; subtext?: string }) {
  return (
    <div className="relative overflow-hidden p-6 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-sm group hover:shadow-md transition-shadow">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-orange-600/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</p>
          {subtext && <p className="text-xs text-orange-600/80 font-medium mt-2 flex items-center gap-1"><TrendingUp size={12} /> {subtext}</p>}
        </div>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 flex items-center justify-center shadow-inner border border-white/60 group-hover:rotate-3 transition-transform">
          <Icon size={26} className="text-orange-600" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, count, label, href }: { icon: LucideIcon; count: number; label: string; href: string }) {
  const isActive = count > 0;
  return (
    <Link href={href} className="flex items-center justify-between p-4 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 hover:bg-orange-50/60 hover:border-orange-200/50 transition-all shadow-sm group">
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm border border-white/50 ${isActive ? "bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600" : "bg-slate-50 text-slate-400"} group-hover:scale-105 transition-transform`}>
          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        </div>
        <div>
          <p className="text-[13px] font-medium text-slate-500 mb-0.5">{label}</p>
          <p className={`text-xl font-bold leading-none ${isActive ? "text-slate-800" : "text-slate-400"}`}>{count}</p>
        </div>
      </div>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? "bg-orange-50" : "bg-slate-50"} group-hover:bg-orange-100 transition-colors`}>
        <ArrowRight size={16} className={`${isActive ? "text-orange-500" : "text-slate-300"} group-hover:translate-x-0.5 transition-transform`} />
      </div>
    </Link>
  );
}
