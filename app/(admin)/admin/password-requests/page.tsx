import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { Lock } from "lucide-react";
import PasswordRequestsClient from "./_components/password-requests-client";

export const metadata = { title: "Request Reset Password — LostFound SMKFN" };

export default async function AdminPasswordRequestsPage() {
  await requireAdmin();

  const requests = await prisma.passwordResetRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      processor: { select: { name: true } },
    },
  });

  const serialized = requests.map((r) => ({
    id: r.id,
    status: r.status as string,
    userName: r.user.name,
    userEmail: r.user.email,
    processorName: r.processor?.name || null,
    processedAt: r.processedAt?.toISOString() || null,
    createdAt: r.createdAt.toISOString(),
  }));

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        icon={Lock}
        title="Request Reset Password"
        subtitle="Kelola permintaan reset password dari pengguna"
        badge={pendingCount > 0 ? `${pendingCount} menunggu` : "0 menunggu"}
      />

      <PasswordRequestsClient requests={serialized} />
    </div>
  );
}
