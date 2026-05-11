import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { StatusBadge } from "@/components/shared/status-badge";
import { CommentSection } from "@/components/shared/comment-section";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ImageGallery } from "@/components/shared/image-gallery";
import { Package, MapPin, Calendar, Clock, Info, FileText, ArrowLeft, User } from "lucide-react";
import ReportVerificationPanel from "./_components/report-verification-panel";

export default async function AdminReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, profile } = await requireAdmin();
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      category: true,
      reporter: { select: { id: true, name: true, jabatan: true, email: true } },
      images: true,
      claims: {
        include: {
          claimant: { select: { name: true, jabatan: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      comments: {
        include: {
          author: { select: { name: true, jabatan: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      foundMatches: {
        where: { status: { in: ["PENDING", "APPROVED", "ITEM_RECEIVED", "COMPLETED"] } },
        include: { finder: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!report) return notFound();

  const isLost = report.type === "LOST";
  const hasImages = report.images.length > 0;
  const mainImageUrl = hasImages ? report.images[0].url : null;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <Link href="/admin/reports" className="flex items-center gap-1 text-orange-600 hover:underline w-fit text-sm font-medium">
        <ArrowLeft size={16} /> Kembali ke Semua Laporan
      </Link>

      <PageHero
        variant="compact"
        icon={isLost ? Package : FileText}
        title={report.itemName}
        subtitle={`${report.category.name} • Dilaporkan oleh ${report.reporter.name}`}
        badge={report.status}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start mt-2">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 flex flex-col gap-6 lg:gap-8">
          {/* Image — Admin can always see */}
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm relative">
            {hasImages ? (
              <ImageGallery images={report.images.map(img => ({ url: img.url, alt: report.itemName }))} />
            ) : (
              <div className="aspect-video sm:aspect-[21/9] bg-slate-50 flex items-center justify-center flex-col gap-3">
                <CategoryIcon name={report.category.name} imageUrl={report.category.imageUrl} size={64} className="text-slate-300" />
                <p className="text-xs text-slate-400 font-medium">Pelapor tidak menyertakan foto</p>
              </div>
            )}
            <div className="absolute top-4 right-4 backdrop-blur-md bg-white/80 px-3 py-1.5 rounded-full border border-white/50 shadow-sm flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isLost ? "bg-red-500" : "bg-green-500"}`} />
              <span className="text-xs font-semibold text-slate-700">{isLost ? "Laporan Kehilangan" : "Laporan Penemuan"}</span>
            </div>
          </div>

          {/* Detail Info */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Info size={20} className="text-orange-500" /> Informasi Barang
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100/50 md:col-span-2">
                <MapPin size={18} className="text-orange-500 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Lokasi</p>
                  <p className="text-sm font-semibold text-slate-800 break-words">{report.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100/50">
                <Calendar size={18} className="text-orange-500 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Tanggal</p>
                  <p className="text-sm font-semibold text-slate-800">{new Date(report.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              </div>
              {report.time && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100/50">
                  <Clock size={18} className="text-orange-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Waktu</p>
                    <p className="text-sm font-semibold text-slate-800">{report.time}</p>
                  </div>
                </div>
              )}
            </div>
            {report.description && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" /> Deskripsi Lengkap
                </h4>
                <p className="text-slate-600 text-sm leading-relaxed p-4 bg-slate-50/80 rounded-xl border border-slate-100/50">
                  {report.description}
                </p>
              </div>
            )}
            {report.rejectionReason && (
              <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100 text-sm text-red-700">
                <strong>Alasan Penolakan:</strong> {report.rejectionReason}
              </div>
            )}
          </div>

          {/* Comments */}
          <CommentSection
            comments={report.comments}
            reportId={report.id}
            currentUserId={user.id}
            currentUserRole={profile.role}
            currentUserName={profile.name}
          />
        </div>

        {/* RIGHT COLUMN — SIDEBAR */}
        <div className="lg:col-span-1 flex flex-col gap-6 sticky top-20">
          {/* Reporter Info */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Informasi Pelapor</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 flex items-center justify-center font-bold">
                {report.reporter.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{report.reporter.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 capitalize">{report.reporter.jabatan.replace(/_/g, " ").toLowerCase()}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <p className="text-xs text-slate-500 flex items-center justify-between">
                <span>Email:</span>
                <span className="font-medium text-slate-700">{report.reporter.email}</span>
              </p>
              <p className="text-xs text-slate-500 flex items-center justify-between">
                <span>Dibuat pada:</span>
                <span className="font-medium text-slate-700">
                  {new Date(report.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </p>
            </div>
            {report.isGuest && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-semibold text-amber-700 mb-1">Laporan Tamu</p>
                <p className="text-xs text-amber-600">Nama: {report.guestName}</p>
                <p className="text-xs text-amber-600">HP: {report.guestPhone}</p>
              </div>
            )}
          </div>

          {/* Quick Link: Active Found Match */}
          {report.type === "LOST" && report.foundMatches.length > 0 && (() => {
            const activeMatch = report.foundMatches.find(fm => 
              ["APPROVED", "ITEM_RECEIVED", "COMPLETED"].includes(fm.status)
            ) || report.foundMatches[0];
            return (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-200 shadow-sm">
                <h3 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                  🔗 Found Match Terkait
                </h3>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{activeMatch.finder.name}</p>
                    <StatusBadge status={activeMatch.status} className="mt-1" />
                  </div>
                  <Link
                    href={`/admin/found-matches/${activeMatch.id}`}
                    className="shrink-0 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    Lihat Detail →
                  </Link>
                </div>
              </div>
            );
          })()}

          {/* Verification / Claims Panel */}
          <ReportVerificationPanel
            reportId={report.id}
            reportStatus={report.status}
            reportType={report.type}
            claims={report.claims.map((c) => ({
              id: c.id,
              status: c.status,
              claimantName: c.claimant.name,
              claimantJabatan: c.claimant.jabatan,
              createdAt: c.createdAt.toISOString(),
            }))}
            foundMatches={report.foundMatches.map((fm) => ({
              id: fm.id,
              status: fm.status,
              finderName: fm.finder.name,
              createdAt: fm.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
