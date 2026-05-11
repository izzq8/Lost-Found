import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { ShieldCheck, FileText, Calendar, Info, ArrowRight, CheckCircle2, Package } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import CancelClaimButton from "./_components/cancel-claim-button";

export const metadata = {
  title: "Riwayat Klaim Saya — LostFound SMKFN",
  description: "Daftar klaim kepemilikan barang yang pernah Anda ajukan",
};

export default async function MyClaimsPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const { user } = await requireAuth();
  const params = await searchParams;

  const claims = await prisma.claim.findMany({
    where: { claimantId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      report: {
        include: { category: true, images: { take: 1, select: { url: true } } }
      }
    }
  });

  const activeClaimsCount = claims.filter(c => ["PENDING", "APPROVED"].includes(c.status)).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        variant="default"
        icon={ShieldCheck}
        title="Riwayat Klaim Saya"
        subtitle={`${claims.length} klaim diajukan · ${activeClaimsCount} sedang diproses`}
      />

      {/* Tab Navigation */}
      <div className="flex bg-slate-100/70 p-1 rounded-xl w-fit border border-slate-200/50 flex-wrap gap-0.5">
        <Link href="/dashboard/my-reports" className="px-5 py-2 text-sm font-semibold rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
          Laporan Saya
        </Link>
        <Link href="/dashboard/my-claims" className="px-5 py-2 text-sm font-semibold rounded-lg bg-white text-orange-600 shadow-sm border border-slate-200/60">
          Klaim Saya
        </Link>
        <Link href="/dashboard/my-found-matches" className="px-5 py-2 text-sm font-semibold rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
          Penemuan Saya
        </Link>
      </div>

      {params.success && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{decodeURIComponent(params.success)}</span>
        </div>
      )}

      {claims.length === 0 ? (
        <div className="rounded-2xl p-12 text-center flex flex-col items-center gap-3 bg-white/50 border border-white/70 backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <ShieldCheck size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-600 font-medium">Belum ada klaim</p>
          <p className="text-sm text-slate-400">Anda belum pernah mengajukan klaim untuk barang ditemukan.</p>
          <Link href="/dashboard/found-items" className="mt-1 flex items-center gap-1.5 text-orange-600 text-sm font-medium hover:underline">
            Lihat daftar barang ditemukan <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {claims.map((claim) => (
            <Link
              key={claim.id}
              href={`/dashboard/found-items/${claim.reportId}`}
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
                <div className={`absolute top-0 left-0 w-full h-0.5 ${claim.status === "APPROVED" ? "bg-green-500" : claim.status === "REJECTED" ? "bg-red-500" : "bg-orange-500"}`} />
                {claim.report.images.length > 0 ? (
                  <img src={claim.report.images[0].url} alt="" className={`w-full h-full object-cover ${claim.status === "PENDING" || claim.status === "REJECTED" ? "blur-sm" : ""}`} />
                ) : claim.report.category.imageUrl && claim.report.category.imageUrl.startsWith("http") ? (
                  <img src={claim.report.category.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package size={24} className="text-slate-300" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-orange-600">
                      Klaim Diajukan
                    </span>
                    <h3 className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-orange-600 transition-colors">
                      {claim.report.itemName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={claim.status} className="shrink-0" />
                    {claim.status === "PENDING" && (
                      <CancelClaimButton claimId={claim.id} itemName={claim.report.itemName} />
                    )}
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-orange-500 transition-colors hidden sm:block" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Package size={11} className="text-slate-400" />
                    <span className="text-[11px]">{claim.report.category.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <Calendar size={11} className="text-slate-400" />
                    <span className="text-[11px]">
                      Diajukan: {new Date(claim.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {claim.rejectionReason && claim.status === "REJECTED" && (
                   <div className="flex items-start gap-2 text-red-500 mt-2 bg-red-50/50 border border-red-100 p-2 rounded-lg text-xs">
                     <Info size={13} className="mt-0.5 shrink-0" />
                     <span className="font-medium">Ditolak: {claim.rejectionReason}</span>
                   </div>
                )}
                {claim.status === "APPROVED" && (
                  <div className="flex items-start gap-2 text-green-600 mt-2 bg-green-50/50 border border-green-100 p-2 rounded-lg text-xs font-medium">
                    <Info size={13} className="mt-0.5 shrink-0" />
                    Silakan ambil barang di Front Office.
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
