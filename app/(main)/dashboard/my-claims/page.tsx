import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { ShieldCheck, FileText, Calendar, Info, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";

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
        include: { category: true }
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
            <div key={claim.id} className="rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="p-4 border-b border-slate-50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{claim.report.itemName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{claim.report.category.name}</p>
                  </div>
                </div>
                <StatusBadge status={claim.status} className="shrink-0" />
              </div>

              <div className="p-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar size={13} />
                    <span className="text-xs font-medium">
                      Diajukan: {new Date(claim.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {claim.rejectionReason && claim.status === "REJECTED" && (
                     <div className="flex items-start gap-2 text-red-500 mt-1 bg-red-50 p-2 rounded-lg text-xs">
                       <Info size={13} className="mt-0.5 shrink-0" />
                       <span className="font-medium">Ditolak: {claim.rejectionReason}</span>
                     </div>
                  )}
                  {claim.status === "APPROVED" && (
                    <div className="flex items-start gap-2 text-green-600 mt-1 bg-green-50 p-2 rounded-lg text-xs font-medium">
                      <Info size={13} className="mt-0.5 shrink-0" />
                      Silakan ambil barang di Front Office.
                    </div>
                  )}
                </div>
                
                <Link 
                  href={`/dashboard/found-items/${claim.reportId}`} 
                  className="px-4 py-2 shrink-0 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-center"
                >
                  Lihat Info & Diskusi
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
