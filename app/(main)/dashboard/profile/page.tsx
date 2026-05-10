import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { User, Mail, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ChangePasswordForm from "./_components/change-password-form";

export const metadata = {
  title: "Profil Saya — LostFound SMKFN",
};

export default async function ProfilePage() {
  const { user, profile } = await requireAuth();

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <Link href="/dashboard" className="flex items-center gap-1 text-orange-600 hover:underline w-fit text-sm font-medium">
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </Link>

      <PageHero
        variant="compact"
        icon={User}
        title="Profil Saya"
        subtitle="Kelola informasi akun Anda"
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center">
          <div className="w-24 h-24 shrink-0 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 flex items-center justify-center text-3xl font-bold shadow-sm">
            {profile.name.substring(0, 2).toUpperCase()}
          </div>
          
          <div className="flex-1 flex flex-col gap-1.5">
            <h2 className="text-2xl font-bold text-slate-800">{profile.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Mail size={16} className="text-slate-400" />
                {profile.email}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5 text-slate-500 capitalize">
                <ShieldAlert size={16} className="text-slate-400" />
                {profile.jabatan.replace(/_/g, " ").toLowerCase()}
              </span>
            </div>
            {profile.role === "ADMIN" && (
              <span className="w-fit mt-2 bg-indigo-100 text-indigo-700 py-1 px-3 rounded-lg text-xs font-bold tracking-wide">
                ADMINISTRATOR
              </span>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50 flex flex-col gap-6">
          
          {/* Akun Info Read Only */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Terdaftar Sejak</p>
                <p className="text-sm font-semibold text-slate-800">
                  {new Date(profile.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
             </div>
             <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Akun</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <p className="text-sm font-semibold text-slate-800">Aktif</p>
                </div>
             </div>
          </div>

        </div>
      </div>

      {/* Keamanan Akun — separated section */}
      <ChangePasswordForm />
    </div>
  );
}
