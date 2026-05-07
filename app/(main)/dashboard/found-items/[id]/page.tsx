import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { CategoryIcon } from "@/components/shared/category-icon";
import { CommentSection } from "@/components/shared/comment-section";
import ReportActionsClient from "@/components/shared/report-actions-client";
import { BackButton } from "@/components/shared/back-button";
import { Package, MapPin, Calendar, Clock, Info, FileText, ArrowLeft, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { ImageGallery } from "@/components/shared/image-gallery";

export default async function FoundItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, profile } = await requireAuth();
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      category: true,
      reporter: { select: { id: true, name: true, jabatan: true } },
      images: true,
      comments: {
        include: {
          author: { select: { name: true, jabatan: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!report || report.type !== "FOUND") return notFound();

  // Aturan Visibilitas Foto
  const isOwner = report.reporterId === user.id;
  const isAdmin = profile.role === "ADMIN";
  const canSeeRealPhoto = isOwner || isAdmin;
  const hasImages = report.images.length > 0;
  const mainImageUrl = canSeeRealPhoto && hasImages ? report.images[0].url : null;

  // Cek hak untuk mengklaim
  let userCanClaim = false;
  if (!isOwner && report.status === "VERIFIED") {
    // Check if ANY claim is already approved/completed for this report
    const approvedClaim = await prisma.claim.findFirst({
      where: { reportId: id, status: { in: ["APPROVED", "COMPLETED"] } },
    });
    if (!approvedClaim) {
      // No approved claim yet — check if THIS user already has a pending claim
      const existingClaim = await prisma.claim.findFirst({
        where: { reportId: id, claimantId: user.id, status: { in: ["PENDING", "APPROVED"] } },
      });
      if (!existingClaim) userCanClaim = true;
    }
  }

  // Cek user's claim (all statuses — for badges + claim comment section)
  const userClaim = await prisma.claim.findFirst({
    where: { reportId: id, claimantId: user.id },
    select: { id: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  // Load claim comments for user's claim (Task 6: claim discussion visibility)
  const userClaimWithComments = userClaim ? await prisma.claim.findUnique({
    where: { id: userClaim.id },
    select: {
      id: true,
      comments: {
        include: { author: { select: { name: true, jabatan: true, role: true } } },
        orderBy: { createdAt: "asc" as const },
      },
    },
  }) : null;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <BackButton
        fallbackHref="/dashboard/found-items"
        fallbackLabel="Kembali ke Daftar Barang Ditemukan"
      />

      <PageHero
        variant="compact"
        icon={Package}
        title={report.itemName}
        subtitle={`${report.category.name} • Dilaporkan oleh ${report.reporter.name}`}
        badge={report.status}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start mt-2">
        {/* KOLOM KIRI */}
        <div className="lg:col-span-2 flex flex-col gap-6 lg:gap-8">
          
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm relative group">
            {canSeeRealPhoto && hasImages ? (
              <ImageGallery images={report.images.map(img => ({ url: img.url, alt: report.itemName }))} />
            ) : (
              <div className="aspect-video sm:aspect-[21/9] bg-slate-50 flex items-center justify-center flex-col gap-3">
                <CategoryIcon name={report.category.name} imageUrl={report.category.imageUrl} size={64} className="text-slate-300" />
                {!canSeeRealPhoto && (
                  <p className="text-xs text-slate-400 font-medium px-4 text-center max-w-sm">
                    Foto disembunyikan untuk publik guna menjaga keamanan dan mencegah klaim palsu.
                  </p>
                )}
              </div>
            )}
            
            <div className="absolute top-4 right-4 backdrop-blur-md bg-white/80 px-3 py-1.5 rounded-full border border-white/50 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-700">Barang Ditemukan</span>
            </div>
          </div>

          {userClaim?.status === "APPROVED" && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-green-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-green-800">Klaim Disetujui!</h3>
                  <p className="text-xs text-green-700 mt-1">Silakan ambil barang di Front Office.</p>
                </div>
              </div>
            </div>
          )}

          {userClaim?.status === "REJECTED" && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <XCircle size={20} className="text-red-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-red-800">Klaim Ditolak</h3>
                  <p className="text-xs text-red-700 mt-1">Klaim Anda untuk barang ini telah ditolak.</p>
                </div>
              </div>
            </div>
          )}

          {report.status === "CLAIMED" && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-green-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-green-800">Selesai</h3>
                  <p className="text-xs text-green-700 mt-1">Barang ini telah berhasil diserahkan ke pemiliknya.</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Info size={20} className="text-orange-500" />
              Informasi Barang
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100/50 md:col-span-2">
                <MapPin size={18} className="text-orange-500 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Lokasi Ditemukan</p>
                  <p className="text-sm font-semibold text-slate-800 break-words">{report.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100/50">
                <Calendar size={18} className="text-orange-500 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Tanggal Ditemukan</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {new Date(report.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              {report.time && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100/50">
                  <Clock size={18} className="text-orange-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Waktu Ditemukan</p>
                    <p className="text-sm font-semibold text-slate-800">{report.time}</p>
                  </div>
                </div>
              )}
            </div>

            {report.description && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" />
                  Deskripsi Lengkap
                </h4>
                <p className="text-slate-600 text-sm leading-relaxed p-4 bg-slate-50/80 rounded-xl border border-slate-100/50">
                  {report.description}
                </p>
              </div>
            )}
          </div>

          <CommentSection 
            comments={report.comments} 
            reportId={report.id} 
            currentUserId={user.id} 
            currentUserRole={profile.role} 
          />

          {/* Diskusi Klaim Anda — Task 6 */}
          {userClaimWithComments && userClaimWithComments.comments.length > 0 && (
            <div className="mt-0">
              <div className="mb-2 px-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Diskusi Klaim Anda</h4>
              </div>
              <CommentSection
                comments={userClaimWithComments.comments}
                claimId={userClaimWithComments.id}
                currentUserId={user.id}
                currentUserRole={profile.role}
              />
            </div>
          )}
        </div>

        {/* KOLOM KANAN */}
        <div className="lg:col-span-1 flex flex-col gap-6 sticky top-24">
          
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Informasi Penemu</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 text-green-700 flex items-center justify-center font-bold">
                {report.reporter.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{report.reporter.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 capitalize">{report.reporter.jabatan.replace(/_/g, " ").toLowerCase()}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 flex items-center justify-between">
                <span>Dibuat pada:</span>
                <span className="font-medium text-slate-700">
                  {new Date(report.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Tindakan</h3>
            <div className="flex flex-col gap-3">
              {userCanClaim ? (
                 <Link href={`/dashboard/claim/${report.id}`} className="flex items-center justify-center gap-2 p-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-sm shadow-orange-200">
                   <ShieldCheck size={18} /> Ajukan Klaim Barang Ini
                 </Link>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-xs text-slate-500">
                    {(() => {
                      if (report.status === "CLAIMED") return "Barang ini sudah diklaim dan diserahkan.";
                      if (report.status === "EXPIRED") return "Laporan ini sudah kedaluwarsa.";
                      if (report.status === "RESOLVED") return "Laporan ini sudah ditutup.";
                      if (report.status === "AWAITING_PICKUP") return "Barang dalam proses pengembalian.";
                      if (report.status === "PENDING") return "Laporan masih dalam peninjauan.";
                      if (report.status === "REJECTED") return "Laporan ini telah ditolak.";
                      if (isOwner) return "Ini adalah laporan Anda.";
                      return "Anda sudah mengajukan klaim.";
                    })()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {isOwner && (
            <ReportActionsClient
              reportId={report.id}
              reportStatus={report.status}
              reportType="FOUND"
              isOwner={isOwner}
              hasActiveFoundMatch={false}
              userHasPendingMatch={false}
            />
          )}

        </div>
      </div>
    </div>
  );
}
