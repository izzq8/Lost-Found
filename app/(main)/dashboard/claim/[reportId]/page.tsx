import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import ClaimFormClient from "./_components/claim-form-client";

export default async function ClaimPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { user } = await requireAuth();
  const { reportId } = await params;

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { category: true },
  });

  if (!report || report.type !== "FOUND") return notFound();

  // Validasi Kepemilikan (tidak bisa mengklaim barang sendiri)
  if (report.reporterId === user.id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
        <p className="text-slate-600 mb-6">Anda tidak dapat mengklaim barang yang Anda laporkan sendiri.</p>
        <Link href={`/dashboard/found-items/${report.id}`} className="text-orange-600 font-semibold hover:underline">
          Kembali ke Detail Barang
        </Link>
      </div>
    );
  }

  // Validasi Status Laporan
  if (report.status !== "VERIFIED") {
    redirect(`/dashboard/found-items/${report.id}`);
  }

  // Halaman Form
  return (
    <div className="max-w-2xl mx-auto py-4">
      <div className="mb-6">
        <Link href={`/dashboard/found-items/${report.id}`} className="flex items-center gap-1 text-orange-600 hover:underline w-fit transition-colors text-sm font-medium mb-4">
          <ArrowLeft size={16} /> Kembali ke Detail Barang
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Ajukan Klaim</h1>
        <p className="text-slate-500 text-sm mt-1">Isi form di bawah untuk membuktikan bahwa barang "{report.itemName}" adalah milik Anda.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-orange-50 border-b border-orange-100 text-orange-800 text-sm flex gap-3">
          <ShieldAlert size={20} className="shrink-0 text-orange-500" />
          <p>
            Berikan deskripsi sejelas mungkin mengenai ciri-ciri barang tersebut. Admin akan membandingkan deskripsi Anda dengan fisik barang untuk verifikasi.
          </p>
        </div>
        <div className="p-6">
          <ClaimFormClient reportId={report.id} itemName={report.itemName} />
        </div>
      </div>
    </div>
  );
}
