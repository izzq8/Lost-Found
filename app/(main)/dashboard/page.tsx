import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { StatCard } from "@/components/shared/stat-card";
import { ItemCard } from "@/components/shared/item-card";
import { LayoutDashboard, Package, Search, FileText, Megaphone } from "lucide-react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const { user } = await requireAuth();

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  if (!profile) return null;

  // Parallel data fetching — all queries are independent
  const [
    activeAnnouncement,
    statLost,
    statFound,
    statMyReports,
    recentLost,
    recentFound,
  ] = await Promise.all([
    // 1. Pengumuman aktif terbaru
    prisma.announcement.findFirst({
      where: {
        publishAt: { lte: new Date() },
        OR: [
          { expiredAt: { gt: new Date() } },
          { expiredAt: new Date("2099-12-31") }
        ]
      },
      orderBy: { publishAt: "desc" }
    }),
    // 2. Statistik
    prisma.report.count({
      where: { type: "LOST", status: { notIn: ["CLAIMED", "EXPIRED", "REJECTED", "RESOLVED"] } }
    }),
    prisma.report.count({
      where: { type: "FOUND", status: { notIn: ["CLAIMED", "EXPIRED", "REJECTED", "RESOLVED"] } }
    }),
    prisma.report.count({
      where: {
        reporterId: user.id,
      }
    }),
    // 3. Recent reports
    prisma.report.findMany({
      where: { type: "LOST", status: { in: ["VERIFIED", "AWAITING_PICKUP", "CLAIMED"] } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        category: true,
        images: { take: 1, orderBy: { createdAt: "asc" } },
      }
    }),
    prisma.report.findMany({
      where: { type: "FOUND", status: { in: ["VERIFIED", "AWAITING_PICKUP", "CLAIMED"] } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { category: true }
    }),
  ]);

  const todayStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Greeting Hero */}
      <PageHero
        variant="large"
        icon={LayoutDashboard}
        title={`Selamat datang, ${profile.name.split(' ')[0]}!`}
        subtitle={todayStr}
      />

      {/* Announcement Alert */}
      {activeAnnouncement && (
        <div 
          className="rounded-xl md:rounded-2xl p-4 md:p-5 flex items-start gap-3 md:gap-4 relative overflow-hidden" 
          style={{ 
            background: 'rgba(255, 237, 213, 0.4)', 
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(253, 186, 116, 0.5)',
            boxShadow: '0 4px 16px rgba(234, 88, 12, 0.05)'
          }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 md:w-1.5 bg-orange-500" />
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 bg-white" style={{ boxShadow: '0 2px 8px rgba(234,88,12,0.1)' }}>
            <Megaphone className="w-[18px] h-[18px] md:w-5 md:h-5 text-orange-600" />
          </div>
          <div className="flex-1 mt-0.5">
            <h3 className="text-sm md:text-[15px] font-bold text-orange-950">{activeAnnouncement.title}</h3>
            <p className="text-xs md:text-[13px] text-orange-700 font-medium mt-0.5 md:mt-1">{activeAnnouncement.content}</p>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5">
        <StatCard icon={Package} value={statLost} label="Barang Hilang" color="#EA580C" />
        <StatCard icon={Search} value={statFound} label="Barang Ditemukan" color="#F97316" />
        <StatCard icon={FileText} value={statMyReports} label="Laporan Saya" color="#C2410C" />
      </div>

      {/* Mobile Quick Actions - hanya tampil di mobile */}
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        <Link
          href="/dashboard/report/lost"
          className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <Package size={18} className="text-red-500" />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>Lapor Hilang</p>
            <p style={{ fontSize: '11px', color: '#94A3B8' }}>Buat laporan</p>
          </div>
        </Link>
        <Link
          href="/dashboard/report/found"
          className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <Search size={18} className="text-green-600" />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>Lapor Ditemukan</p>
            <p style={{ fontSize: '11px', color: '#94A3B8' }}>Buat laporan</p>
          </div>
        </Link>
      </div>

      {/* Recent Lost Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B' }}>Barang Hilang Terbaru</h2>
          <Link href="/dashboard/lost-items" className="flex items-center gap-1 text-orange-600 hover:underline" style={{ fontSize: '13px', fontWeight: 500 }}>
            Lihat Semua <ArrowRight size={14} />
          </Link>
        </div>
        
        {recentLost.length === 0 ? (
           <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200 p-8 text-center">
             <p className="text-slate-500 text-sm">Belum ada laporan barang hilang.</p>
           </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {recentLost.map(report => (
              <ItemCard key={report.id} report={{
                id: report.id,
                type: report.type,
                status: report.status,
                itemName: report.itemName,
                location: report.location,
                date: report.date,
                category: { name: report.category.name, imageUrl: report.category.imageUrl },
                reportImageUrl: report.images[0]?.url,
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Found Items */}
      <div>
        <div className="flex items-center justify-between mb-4 mt-2">
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B' }}>Barang Ditemukan Terbaru</h2>
          <Link href="/dashboard/found-items" className="flex items-center gap-1 text-orange-600 hover:underline" style={{ fontSize: '13px', fontWeight: 500 }}>
            Lihat Semua <ArrowRight size={14} />
          </Link>
        </div>

        {recentFound.length === 0 ? (
           <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200 p-8 text-center">
             <p className="text-slate-500 text-sm">Belum ada laporan barang ditemukan.</p>
           </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {recentFound.map(report => (
              <ItemCard key={report.id} report={{
                 id: report.id,
                 type: report.type,
                 status: report.status,
                 itemName: report.itemName,
                 location: report.location,
                 date: report.date,
                 category: { name: report.category.name, imageUrl: report.category.imageUrl }
              }} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
