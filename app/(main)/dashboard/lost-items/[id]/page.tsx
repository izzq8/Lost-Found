import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { CategoryIcon } from "@/components/shared/category-icon";
import { CommentSection } from "@/components/shared/comment-section";
import { FoundMatchForm } from "./_components/found-match-form";
import ReportActionsClient from "@/components/shared/report-actions-client";
import { BackButton } from "@/components/shared/back-button";
import { Package, MapPin, Calendar, Clock, Info, FileText, ArrowLeft, Search, CheckCircle2, Truck } from "lucide-react";
import { ImageGallery } from "@/components/shared/image-gallery";

export default async function LostItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
      foundMatches: {
        where: { status: { in: ["PENDING", "APPROVED", "ITEM_RECEIVED", "COMPLETED"] } },
        include: {
          finder: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!report || report.type !== "LOST") return notFound();

  // Aturan Visibilitas Foto 
  const isOwner = report.reporterId === user.id;
  const isAdmin = profile.role === "ADMIN";
  // LOST items: semua user yang login bisa lihat foto asli (spec v2.1)
  const canSeeRealPhoto = true;
  const hasImages = report.images.length > 0;

  // Found Match logic — separate APPROVED+ from PENDING
  const allFoundMatches = report.foundMatches;
  const approvedOrBeyondMatch = allFoundMatches.find(
    fm => ["APPROVED", "ITEM_RECEIVED", "COMPLETED"].includes(fm.status)
  );
  const hasApprovedMatch = !!approvedOrBeyondMatch;
  const activeFoundMatch = approvedOrBeyondMatch ?? allFoundMatches[0] ?? null;

  // Check if current user has any active found match
  const userActiveMatch = allFoundMatches.find(
    fm => fm.finder.id === user.id && ["PENDING", "APPROVED", "ITEM_RECEIVED"].includes(fm.status)
  );

  // Show found match form when:
  // - Report is LOST + VERIFIED
  // - User is NOT the reporter
  // - No APPROVED/ITEM_RECEIVED match exists (allow multiple PENDING)
  // - User doesn't already have an active match
  const canShowFoundMatchForm =
    report.status === "VERIFIED" &&
    !isOwner &&
    !hasApprovedMatch &&
    !userActiveMatch;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <BackButton
        fallbackHref="/dashboard/lost-items"
        fallbackLabel="Kembali ke Daftar Barang Hilang"
      />

      <PageHero
        variant="compact"
        icon={Package}
        title={report.itemName}
        subtitle={`${report.category.name} • Dilaporkan oleh ${report.reporter.name}`}
        badge={report.status}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start mt-2">
        {/* KOLOM KIRI - INFO & DISKUSI */}
        <div className="lg:col-span-2 flex flex-col gap-6 lg:gap-8">
          
          {/* Main Visual */}
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm relative group">
            {canSeeRealPhoto && hasImages ? (
              <ImageGallery images={report.images.map(img => ({ url: img.url, alt: report.itemName }))} />
            ) : (
              <div className="aspect-video sm:aspect-[21/9] bg-slate-50 flex items-center justify-center flex-col gap-3">
                <Package size={64} className="text-slate-300" />
                <p className="text-xs text-slate-400 font-medium">
                  Pelapor tidak menyertakan foto untuk laporan ini.
                </p>
              </div>
            )}
            
            <div className="absolute top-4 right-4 backdrop-blur-md bg-white/80 px-3 py-1.5 rounded-full border border-white/50 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-700">Barang Hilang</span>
            </div>
          </div>

          {/* Found Match Status Banner */}
          {report.status === "AWAITING_PICKUP" && activeFoundMatch && (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Truck size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-800">Barang Ditemukan — Menunggu Pengambilan</h3>
                  <p className="text-xs text-emerald-700 mt-1">
                    Barang ini telah ditemukan oleh <span className="font-semibold">{activeFoundMatch.finder.name}</span> dan sudah diserahkan ke admin. 
                    {isOwner && " Silakan datang ke Front Office untuk mengambil barang Anda."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasApprovedMatch && activeFoundMatch?.status === "APPROVED" && (
            <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Search size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-800">Barang Ditemukan!</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    Seseorang telah menemukan barang ini. Menunggu penyerahan barang ke admin.
                    {isOwner && " Anda akan diberitahu saat barang siap diambil."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {report.status === "CLAIMED" && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-green-800">Selesai</h3>
                  <p className="text-xs text-green-700 mt-1">
                    Barang ini telah berhasil dikembalikan ke pemiliknya.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Info size={20} className="text-orange-500" />
              Informasi Barang
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100/50 md:col-span-2">
                <MapPin size={18} className="text-orange-500 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Lokasi Terakhir Dilihat</p>
                  <p className="text-sm font-semibold text-slate-800 break-words">{report.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100/50">
                <Calendar size={18} className="text-orange-500 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">Tanggal Hilang</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {new Date(report.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              {report.time && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100/50">
                  <Clock size={18} className="text-orange-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Perkiraan Waktu</p>
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

          {/* Komentar */}
          <CommentSection 
            comments={report.comments} 
            reportId={report.id} 
            currentUserId={user.id} 
            currentUserRole={profile.role}
            currentUserName={profile.name}
          />
        </div>

        {/* KOLOM KANAN - SIDEBAR */}
        <div className="lg:col-span-1 flex flex-col gap-6 sticky top-24">
          
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
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 flex items-center justify-between">
                <span>Dibuat pada:</span>
                <span className="font-medium text-slate-700">
                  {new Date(report.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </p>
            </div>
          </div>

          {/* Tindakan / Found Match Form */}
          <div className="flex flex-col gap-4">
            {isOwner ? (
              <ReportActionsClient
                reportId={report.id}
                reportStatus={report.status}
                reportType="LOST"
                isOwner={isOwner}
                hasActiveFoundMatch={hasApprovedMatch}
                userHasPendingMatch={!!userActiveMatch}
              />
            ) : canShowFoundMatchForm ? (
              <FoundMatchForm reportId={report.id} reportItemName={report.itemName} />
            ) : userActiveMatch?.status === "APPROVED" ? (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm">
                <h3 className="text-sm font-bold text-orange-800 mb-3">Tindakan Anda</h3>
                <div className="p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
                  <p className="text-xs text-orange-800 font-semibold mb-1">⚡ Segera Serahkan Barang</p>
                  <p className="text-xs text-orange-700 leading-relaxed">
                    Laporan penemuan Anda telah disetujui. Silakan segera serahkan barang ke <strong>Front Office</strong> agar dapat dikembalikan ke pemiliknya.
                  </p>
                </div>
              </div>
            ) : userActiveMatch?.status === "PENDING" ? (
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Tindakan</h3>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center">
                  <p className="text-xs text-amber-700 font-medium">
                    Anda sudah mengirim laporan penemuan untuk barang ini. Menunggu review admin.
                  </p>
                </div>
              </div>
            ) : ["CLAIMED", "RESOLVED", "EXPIRED", "REJECTED"].includes(report.status) ? (
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Tindakan</h3>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-xs text-slate-500">Laporan ini sudah selesai.</p>
                </div>
              </div>
            ) : hasApprovedMatch ? (
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Tindakan</h3>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center">
                  <p className="text-xs text-blue-700 font-medium">
                    Barang ini sudah dalam proses pengembalian.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Tindakan</h3>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-xs text-slate-500">Tidak ada tindakan yang tersedia saat ini.</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
