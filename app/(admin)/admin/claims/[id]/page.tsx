import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { StatusBadge } from "@/components/shared/status-badge";
import { CommentSection } from "@/components/shared/comment-section";
import { ClipboardList, ArrowLeft, User, MapPin, Calendar, FileText, Image, Package } from "lucide-react";
import ClaimActionPanel from "./_components/claim-action-panel";

export default async function AdminClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, profile } = await requireAdmin();
  const { id } = await params;

  const claim = await prisma.claim.findUnique({
    where: { id },
    include: {
      claimant: { select: { id: true, name: true, jabatan: true, email: true } },
      report: {
        include: {
          category: true,
          reporter: { select: { name: true } },
          images: true,
        },
      },
      images: true,
      comments: {
        include: {
          author: { select: { name: true, jabatan: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!claim) return notFound();

  return (
    <div className="flex flex-col gap-6 pb-12">
      <Link href="/admin/claims" className="flex items-center gap-1 text-orange-600 hover:underline w-fit text-sm font-medium">
        <ArrowLeft size={16} /> Kembali ke Semua Klaim
      </Link>

      <PageHero
        variant="compact"
        icon={ClipboardList}
        title={`Klaim: ${claim.report.itemName}`}
        subtitle={`Oleh ${claim.claimant.name} • ${new Date(claim.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}
        badge={claim.status}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start mt-2">
        {/* LEFT: Claim Info */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Claimant Info */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User size={18} className="text-orange-500" /> Informasi Pengklaim
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 flex items-center justify-center text-lg font-bold">
                {claim.claimant.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{claim.claimant.name}</p>
                <p className="text-sm text-slate-500 capitalize">{claim.claimant.jabatan.replace(/_/g, " ").toLowerCase()}</p>
                <p className="text-xs text-slate-400 mt-0.5">{claim.claimant.email}</p>
              </div>
            </div>
            {claim.isGuest && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-semibold text-amber-700">Klaim Tamu</p>
                <p className="text-xs text-amber-600">Nama: {claim.guestName} | HP: {claim.guestPhone}</p>
              </div>
            )}
          </div>

          {/* Claim Description */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-orange-500" /> Deskripsi Ciri-ciri dari Pengklaim
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed p-4 bg-slate-50/80 rounded-xl border border-slate-100/50">
              {claim.description}
            </p>

            {claim.rejectionReason && (
              <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100 text-sm text-red-700">
                <strong>Alasan Penolakan:</strong> {claim.rejectionReason}
              </div>
            )}
          </div>

          {/* Claim Evidence Images */}
          {claim.images.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Image size={18} className="text-orange-500" /> Bukti Kepemilikan
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {claim.images.map((img) => (
                  <div key={img.id} className="aspect-square rounded-xl border border-slate-200 overflow-hidden">
                    <img src={img.url} alt="Bukti" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <CommentSection
            comments={claim.comments}
            claimId={claim.id}
            currentUserId={user.id}
            currentUserRole={profile.role}
            currentUserName={profile.name}
          />
        </div>

        {/* RIGHT: Item Info + Action */}
        <div className="lg:col-span-2 flex flex-col gap-6 sticky top-20">
          {/* Original Report Info */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Info Barang Asli</h3>
            {claim.report.images.length > 0 ? (
              <div className="aspect-video rounded-xl overflow-hidden mb-4 border border-slate-200">
                <img src={claim.report.images[0].url} alt={claim.report.itemName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-video rounded-xl mb-4 bg-slate-50 flex items-center justify-center border border-slate-200">
                <Package size={40} className="text-slate-300" />
              </div>
            )}
            <div className="space-y-2.5">
              <div>
                <p className="text-xs font-medium text-slate-500">Nama Barang</p>
                <p className="text-sm font-semibold text-slate-800">{claim.report.itemName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Kategori</p>
                <p className="text-sm text-slate-700">{claim.report.category.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Lokasi Ditemukan</p>
                <p className="text-sm text-slate-700">{claim.report.location}</p>
              </div>
              {claim.report.description && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Deskripsi Asli</p>
                  <p className="text-sm text-slate-600">{claim.report.description}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-500">Pelapor</p>
                <p className="text-sm text-slate-700">{claim.report.reporter.name}</p>
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <ClaimActionPanel
            claimId={claim.id}
            claimStatus={claim.status}
          />
        </div>
      </div>
    </div>
  );
}
