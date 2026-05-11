import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { StatusBadge } from "@/components/shared/status-badge";
import { Search, MapPin, Calendar, Package, ArrowRight, Info, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Riwayat Penemuan Saya — LostFound SMKFN",
  description: "Daftar laporan barang yang pernah Anda temukan dan dilaporkan ke sistem",
};

export default async function MyFoundMatchesPage() {
  const { user } = await requireAuth();

  const foundMatches = await prisma.foundMatch.findMany({
    where: { finderId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      report: {
        include: {
          category: true,
          images: { take: 1, select: { url: true } },
        },
      },
      images: { take: 1, select: { url: true } },
    },
  });

  const activeCount = foundMatches.filter((fm) =>
    ["PENDING", "APPROVED"].includes(fm.status)
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        variant="default"
        icon={Search}
        title="Riwayat Penemuan Saya"
        subtitle={`${foundMatches.length} laporan penemuan · ${activeCount} sedang diproses`}
      />

      {/* Tab Navigation */}
      <div className="flex bg-slate-100/70 p-1 rounded-xl w-fit border border-slate-200/50 flex-wrap gap-0.5">
        <Link
          href="/dashboard/my-reports"
          className="px-5 py-2 text-sm font-semibold rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
        >
          Laporan Saya
        </Link>
        <Link
          href="/dashboard/my-claims"
          className="px-5 py-2 text-sm font-semibold rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
        >
          Klaim Saya
        </Link>
        <Link
          href="/dashboard/my-found-matches"
          className="px-5 py-2 text-sm font-semibold rounded-lg bg-white text-orange-600 shadow-sm border border-slate-200/60"
        >
          Penemuan Saya
        </Link>
      </div>

      {/* Empty State */}
      {foundMatches.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center flex flex-col items-center gap-3"
          style={{
            background: "rgba(255,255,255,0.5)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.7)",
          }}
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Search size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-600 font-medium">Belum ada laporan penemuan</p>
          <p className="text-sm text-slate-400">
            Jika Anda menemukan barang hilang milik orang lain, laporkan melalui halaman detail barang hilang.
          </p>
          <Link
            href="/dashboard/lost-items"
            className="mt-1 flex items-center gap-1.5 text-orange-600 text-sm font-medium hover:underline"
          >
            Lihat daftar barang hilang <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {foundMatches.map((fm) => {
            const isApproved = fm.status === "APPROVED";
            const isCompleted = fm.status === "COMPLETED";
            const isRejected = fm.status === "REJECTED";

            // Thumbnail: prioritize the finder's own upload photo, fallback to report image, then category
            const thumbnailUrl =
              fm.images.length > 0
                ? fm.images[0].url
                : fm.report.images.length > 0
                ? fm.report.images[0].url
                : null;
            const categoryImg =
              fm.report.category.imageUrl &&
              (fm.report.category.imageUrl.startsWith("http://") ||
                fm.report.category.imageUrl.startsWith("https://"))
                ? fm.report.category.imageUrl
                : null;

            return (
              <Link
                key={fm.id}
                href={`/dashboard/lost-items/${fm.reportId}`}
                className={`rounded-xl md:rounded-2xl p-4 flex gap-4 items-start transition-all hover:shadow-md cursor-pointer group ${
                  isApproved ? "ring-2 ring-orange-400/70" : ""
                }`}
                style={{
                  background: isApproved
                    ? "rgba(255,247,237,0.85)"
                    : "rgba(255,255,255,0.5)",
                  backdropFilter: "blur(12px)",
                  border: isApproved
                    ? "1px solid rgba(251,146,60,0.4)"
                    : "1px solid rgba(255,255,255,0.7)",
                  boxShadow: isApproved
                    ? "0 2px 14px rgba(234,88,12,0.12)"
                    : "0 2px 8px rgba(0,0,0,0.04)",
                  animation: isApproved
                    ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                    : undefined,
                }}
              >
                {/* Thumbnail */}
                <div className="mt-0.5 shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center relative">
                  <div
                    className={`absolute top-0 left-0 w-full h-0.5 ${
                      isApproved
                        ? "bg-orange-500"
                        : isCompleted
                        ? "bg-green-500"
                        : isRejected
                        ? "bg-red-500"
                        : "bg-amber-400"
                    }`}
                  />
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : categoryImg ? (
                    <img
                      src={categoryImg}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={24} className="text-slate-300" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-orange-600">
                      Laporan Penemuan
                    </span>
                    <h3 className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-orange-600 transition-colors truncate">
                      {fm.report.itemName}
                    </h3>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center items-end gap-2 shrink-0">
                    <StatusBadge status={fm.status} className="shrink-0" />
                    {isApproved && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold animate-pulse">
                        Segera Serahkan!
                      </span>
                    )}
                    <ArrowRight
                      size={14}
                      className="text-slate-300 group-hover:text-orange-500 transition-colors hidden sm:block"
                    />
                  </div>
                </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Package size={11} className="text-slate-400" />
                      <span className="text-[11px]">{fm.report.category.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Calendar size={11} className="text-slate-400" />
                      <span className="text-[11px]">
                        Dilaporkan:{" "}
                        {new Date(fm.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Contextual messages */}
                  {isApproved && (
                    <div className="flex items-start gap-2 text-orange-600 mt-2 bg-orange-50/70 border border-orange-200 p-2 rounded-lg text-xs font-medium">
                      <Info size={13} className="mt-0.5 shrink-0" />
                      Penemuan Anda disetujui! Segera serahkan barang ke Front Office.
                    </div>
                  )}
                  {fm.status === "ITEM_RECEIVED" && (
                    <div className="flex items-start gap-2 text-blue-600 mt-2 bg-blue-50/70 border border-blue-200 p-2 rounded-lg text-xs font-medium">
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                      Barang sudah diterima admin. Menunggu pengambilan oleh pemilik.
                    </div>
                  )}
                  {isCompleted && (
                    <div className="flex items-start gap-2 text-green-600 mt-2 bg-green-50/70 border border-green-200 p-2 rounded-lg text-xs font-medium">
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                      Serah terima selesai. Terima kasih sudah membantu!
                    </div>
                  )}
                  {isRejected && fm.rejectionReason && (
                    <div className="flex items-start gap-2 text-red-500 mt-2 bg-red-50/50 border border-red-100 p-2 rounded-lg text-xs">
                      <Info size={13} className="mt-0.5 shrink-0" />
                      <span className="font-medium">Ditolak: {fm.rejectionReason}</span>
                    </div>
                  )}
                  {isRejected && !fm.rejectionReason && (
                    <div className="flex items-start gap-2 text-red-500 mt-2 bg-red-50/50 border border-red-100 p-2 rounded-lg text-xs">
                      <Info size={13} className="mt-0.5 shrink-0" />
                      <span className="font-medium">Laporan penemuan Anda tidak disetujui.</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
