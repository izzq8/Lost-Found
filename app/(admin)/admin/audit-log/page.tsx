import { requireAdmin } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { Activity } from "lucide-react";
import Link from "next/link";
import AuditLogClient from "./_components/audit-log-client";

export const metadata = {
  title: "Audit Trail — LostFound SMKFN",
};

export default async function AuditLogPage() {
  await requireAdmin();

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true, jabatan: true } } },
  });

  const serialized = logs.map((log) => ({
    id: log.id,
    action: log.action,
    actorName: log.actor?.name || "Sistem",
    actorJabatan: log.actor?.jabatan || null,
    targetType: log.targetType,
    targetId: log.targetId,
    detail: log.detail,
    createdAt: log.createdAt.toISOString(),
  }));

  // Get unique actions for filter dropdown
  const uniqueActions = [...new Set(logs.map((l) => l.action))].sort();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="flex items-center gap-1 text-orange-600 hover:underline w-fit text-sm font-medium"
      >
        ← Kembali ke Dashboard
      </Link>

      <PageHero
        variant="default"
        icon={Activity}
        title="Audit Trail"
        subtitle="Log semua aktivitas penting dalam sistem"
        badge={`${serialized.length} entri`}
      />

      <AuditLogClient logs={serialized} uniqueActions={uniqueActions} />
    </div>
  );
}
