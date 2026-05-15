import { requireAdmin } from "@/lib/utils/auth-guard";
import { PageHero } from "@/components/shared/page-hero";
import { Activity } from "lucide-react";
import AuditLogClient from "./_components/audit-log-client";
import { getAdminAuditLogsList } from "@/lib/queries/admin-list.query";

export const metadata = {
  title: "Audit Trail — LostFound SMKFN",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    action?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const result = await getAdminAuditLogsList(params);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        variant="default"
        icon={Activity}
        title="Audit Trail"
        subtitle="Log semua aktivitas penting dalam sistem"
        badge={`${result.pagination.totalItems} entri`}
      />

      <AuditLogClient
        key={`${result.filters.q}:${result.filters.actions.join(",")}:${result.pagination.page}`}
        logs={result.items}
        actions={result.actions}
        filters={result.filters}
        pagination={result.pagination}
      />
    </div>
  );
}
