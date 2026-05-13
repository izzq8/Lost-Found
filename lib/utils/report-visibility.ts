import type { ReportStatus } from "@prisma/client";

export const PUBLIC_REPORT_STATUSES = [
  "VERIFIED",
  "AWAITING_PICKUP",
  "CLAIMED",
] as const satisfies readonly ReportStatus[];

export const PUBLIC_ACTIVE_REPORT_STATUSES = [
  "VERIFIED",
  "AWAITING_PICKUP",
] as const satisfies readonly ReportStatus[];

export const PUBLIC_DONE_REPORT_STATUSES = [
  "CLAIMED",
] as const satisfies readonly ReportStatus[];

export type PublicReportStatusGroup = "all" | "active" | "done";

export function getPublicStatusesForGroup(
  group: string | undefined
): ReportStatus[] {
  if (group === "active") return [...PUBLIC_ACTIVE_REPORT_STATUSES];
  if (group === "done") return [...PUBLIC_DONE_REPORT_STATUSES];
  return [...PUBLIC_REPORT_STATUSES];
}

export function isPublicReportStatus(status: ReportStatus): boolean {
  return (PUBLIC_REPORT_STATUSES as readonly ReportStatus[]).includes(status);
}

export function canViewReportByVisibility({
  status,
  reporterId,
  viewerId,
  viewerRole,
}: {
  status: ReportStatus;
  reporterId: string;
  viewerId: string;
  viewerRole: string;
}) {
  if (viewerRole === "ADMIN") return true;
  if (reporterId === viewerId) return true;
  return isPublicReportStatus(status);
}
