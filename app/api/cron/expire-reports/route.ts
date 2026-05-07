import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { REPORT_EXPIRY_DAYS, REPORT_PRE_EXPIRY_WARNING_DAYS, NOTIFICATION_TYPES, AUDIT_ACTIONS } from "@/lib/utils/constants";

export async function GET(request: Request) {
  // Validate cron secret (security)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const expiryThreshold = new Date(now);
    expiryThreshold.setDate(expiryThreshold.getDate() - REPORT_EXPIRY_DAYS);

    const warningThreshold = new Date(now);
    warningThreshold.setDate(warningThreshold.getDate() - (REPORT_EXPIRY_DAYS - REPORT_PRE_EXPIRY_WARNING_DAYS));

    // 1. Expire reports that have been VERIFIED for more than 30 days
    // EXCLUDE reports that have an active FoundMatch (PENDING/APPROVED)
    const expiredReports = await prisma.report.updateMany({
      where: {
        status: "VERIFIED",
        verifiedAt: { lte: expiryThreshold },
        foundMatches: {
          none: {
            status: { in: ["PENDING", "APPROVED"] },
          },
        },
      },
      data: {
        status: "EXPIRED",
        expiredAt: now,
      },
    });

    // 2. If any expired, create audit logs
    if (expiredReports.count > 0) {
      await prisma.auditLog.create({
        data: {
          action: AUDIT_ACTIONS.REPORT_EXPIRED,
          actorId: null,
          targetType: "Report",
          detail: `Sistem mengexpire ${expiredReports.count} laporan yang sudah ${REPORT_EXPIRY_DAYS} hari berstatus Verified.`,
        },
      });

      // Create notifications for expired reports
      const justExpired = await prisma.report.findMany({
        where: {
          status: "EXPIRED",
          expiredAt: { gte: new Date(now.getTime() - 60000) }, // within last minute
        },
        select: { id: true, itemName: true, reporterId: true },
      });

      if (justExpired.length > 0) {
        await prisma.notification.createMany({
          data: justExpired.map((r) => ({
            userId: r.reporterId,
            type: NOTIFICATION_TYPES.REPORT_EXPIRED,
            message: `Laporan Anda untuk '${r.itemName}' telah expired karena tidak ada klaim dalam ${REPORT_EXPIRY_DAYS} hari.`,
            data: { reportId: r.id },
          })),
          skipDuplicates: true,
        });
      }
    }

    // 3. Send pre-expiry notifications (25 days = 5 days before expiration)
    const nearExpireReports = await prisma.report.findMany({
      where: {
        status: "VERIFIED",
        verifiedAt: {
          lte: warningThreshold,
          gt: expiryThreshold,
        },
      },
      select: { id: true, itemName: true, reporterId: true },
    });

    // Check existing notifications to prevent duplicates
    let preExpireCount = 0;
    for (const report of nearExpireReports) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: report.reporterId,
          type: NOTIFICATION_TYPES.REPORT_NEAR_EXPIRY,
          data: { path: ["reportId"], equals: report.id },
        },
      });

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: report.reporterId,
            type: NOTIFICATION_TYPES.REPORT_NEAR_EXPIRY,
            message: `Laporan Anda untuk '${report.itemName}' akan expired dalam ${REPORT_PRE_EXPIRY_WARNING_DAYS} hari.`,
            data: { reportId: report.id },
          },
        });
        preExpireCount++;
      }
    }

    return NextResponse.json({
      success: true,
      expired: expiredReports.count,
      nearExpire: preExpireCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Cron expire-reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
