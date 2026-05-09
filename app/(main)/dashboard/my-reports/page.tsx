import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { StatusBadge } from "@/components/shared/status-badge";
import { FileText, MapPin, Calendar, Package, PenLine, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Riwayat Laporan Saya — LostFound SMKFN",
  description: "Daftar semua laporan barang hilang dan ditemukan yang pernah Anda buat",
};

export default async function MyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { user } = await requireAuth();
  const params = await searchParams;

  const reports = await prisma.report.findMany({
    where: { reporterId: user.id },
    orderBy: { createdAt: "desc" },
    include: { category: true, images: { take: 1, select: { url: true } } },
  });

  const lostCount = reports.filter(
    (r) => r.type === "LOST" && !["CLAIMED", "EXPIRED", "REJECTED", "RESOLVED"].includes(r.status)
  ).length;
  const foundCount = reports.filter(
    (r) => r.type === "FOUND" && !["CLAIMED", "EXPIRED", "REJECTED", "RESOLVED"].includes(r.status)
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        variant="default"
        icon={FileText}
        title="Riwayat Laporan Saya"
        subtitle={`${reports.length} laporan total · ${lostCount + foundCount} aktif`}
      />

      {/* Tab Navigation */}
      <div className="flex bg-slate-100/70 p-1 rounded-xl w-fit border border-slate-200/50">
        <Link href="/dashboard/my-reports" className="px-5 py-2 text-sm font-semibold rounded-lg bg-white text-orange-600 shadow-sm border border-slate-200/60">
          Laporan Saya
        </Link>
        <Link href="/dashboard/my-claims" className="px-5 py-2 text-sm font-semibold rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
          Klaim Saya
        </Link>
      </div>

      {/* Success Toast */}
      {params.success && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{decodeURIComponent(params.success)}</span>
        </div>
      )}

      {/* CTA Buttons */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/report/lost"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors shadow-sm shadow-orange-200"
        >
          <PenLine size={15} /> Lapor Barang Hilang
        </Link>
        <Link
          href="/dashboard/report/found"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-500/40 bg-orange-50 text-orange-700 text-sm font-semibold hover:bg-orange-100 transition-colors"
        >
          <PenLine size={15} /> Lapor Barang Ditemukan
        </Link>
      </div>

      {/* Reports List */}
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
          <p className="text-slate-600 font-medium">Belum ada laporan</p>
          <p className="text-sm text-slate-400">Mulai buat laporan barang hilang atau yang Anda temukan.</p>
          <Link
            href="/dashboard/report/lost"
            className="mt-1 flex items-center gap-1.5 text-orange-600 text-sm font-medium hover:underline"
          >
            Buat laporan pertama <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report) => {
            const routePrefix = report.type === "LOST" ? "lost-items" : "found-items";
            return (
              <Link
                key={report.id}
                href={`/dashboard/${routePrefix}/${report.id}`}
                className="rounded-xl md:rounded-2xl p-4 flex gap-4 items-start transition-all hover:shadow-md cursor-pointer group"
                style={{
                  background: "rgba(255,255,255,0.5)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.7)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                {/* Thumbnail */}
                <div className="mt-0.5 shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center relative">
                  <div className={`absolute top-0 left-0 w-full h-0.5 ${report.type === "LOST" ? "bg-red-500" : "bg-green-500"}`} />
                  {report.images.length > 0 ? (
                    <img src={report.images[0].url} alt="" className="w-full h-full object-cover" />
                  ) : report.category.imageUrl && report.category.imageUrl.startsWith("http") ? (
                    <img src={report.category.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package size={24} className="text-slate-300" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide ${
                          report.type === "LOST" ? "text-red-500" : "text-green-600"
                        }`}
                      >
                        {report.type === "LOST" ? "Hilang" : "Ditemukan"}
                      </span>
                      <h3 className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-orange-600 transition-colors">
                        {report.itemName}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={report.status} className="shrink-0" />
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Package size={11} className="text-slate-400" />
                      <span className="text-[11px]">{report.category.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <MapPin size={11} className="text-slate-400" />
                      <span className="text-[11px] truncate max-w-[160px]">{report.location}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Calendar size={11} className="text-slate-400" />
                      <span className="text-[11px]">
                        {new Date(report.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
