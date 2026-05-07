import { requireAdmin } from "@/lib/utils/auth-guard";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { UserPlus, ArrowLeft } from "lucide-react";
import CreateAdminForm from "./_components/create-admin-form";

export const metadata = { title: "Buat Akun Admin — LostFound SMKFN" };

export default async function CreateAdminPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6 max-w-[520px] mx-auto w-full">
      <Link
        href="/admin/users"
        className="flex items-center gap-1 text-orange-600 hover:underline w-fit text-sm font-medium"
      >
        <ArrowLeft size={16} /> Kembali ke Manajemen User
      </Link>

      <PageHero
        variant="compact"
        icon={UserPlus}
        title="Buat Akun Admin"
        subtitle="Tambahkan akun administrator baru ke sistem"
      />

      <CreateAdminForm />
    </div>
  );
}
