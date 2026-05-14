// lib/utils/notification-href.ts
// Maps notification type + data → target URL for clickable notifications

type NotifData = Record<string, string> | null;

/**
 * Resolves the target URL for a notification based on its type and data payload.
 * Returns null if no meaningful navigation target exists.
 */
export function getNotificationHref(
  type: string,
  data: NotifData,
  role: "USER" | "ADMIN" = "USER"
): string | null {
  const reportId = data?.reportId;
  const claimId = data?.claimId;
  const foundMatchId = data?.foundMatchId;

  if (role === "ADMIN") {
    switch (type) {
      // Report events → admin report detail
      case "REPORT_RESOLVED":
        return reportId ? `/admin/reports/${reportId}` : "/admin/reports";

      // Claim events → admin claim detail
      case "NEW_CLAIM":
        return claimId ? `/admin/claims/${claimId}` : "/admin/claims";

      // Found match events → admin found-match detail
      case "FOUND_MATCH_SUBMITTED":
        return foundMatchId ? `/admin/found-matches/${foundMatchId}` : "/admin/found-matches";

      // Comment events
      case "NEW_COMMENT":
        if (claimId) return `/admin/claims/${claimId}`;
        if (reportId) return `/admin/reports/${reportId}`;
        return null;

      default:
        return null;
    }
  }

  // USER role
  switch (type) {
    // Report events → my reports
    case "REPORT_VERIFIED":
    case "REPORT_REJECTED":
    case "REPORT_CLAIMED":
      return "/dashboard/my-reports";

    // Claim events → my claims
    case "CLAIM_APPROVED":
    case "CLAIM_REJECTED":
    case "CLAIM_COMPLETED":
    case "NEW_CLAIM":
      return "/dashboard/my-claims";

    // Found match events → lost item detail (user needs to see their report)
    case "FOUND_MATCH_APPROVED":
    case "FOUND_MATCH_REJECTED":
    case "FOUND_MATCH_ITEM_RECEIVED":
    case "FOUND_MATCH_COMPLETED":
    case "FOUND_MATCH_PENDING":
      return reportId ? `/dashboard/lost-items/${reportId}` : "/dashboard/my-reports";

    // Found match submitted (user is the finder, notified about their own submission)
    case "FOUND_MATCH_SUBMITTED":
      return reportId ? `/dashboard/lost-items/${reportId}` : "/dashboard/lost-items";

    // Comment events
    case "NEW_COMMENT":
      if (claimId) return "/dashboard/my-claims";
      if (reportId) return "/dashboard/my-reports";
      return null;

    default:
      return null;
  }
}
