import type { Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

type NavigationProfile = Pick<Profile, "id" | "name" | "jabatan">;

export interface NavigationUserSnapshot {
  currentUser: {
    id: string;
    name: string;
    jabatan: string;
    avatarInitials: string;
  };
  unreadCount: number;
}

export interface UserNavigationSnapshot extends NavigationUserSnapshot {
  totalActionableBadge: number;
}

export interface AdminNavigationSnapshot extends NavigationUserSnapshot {
  pendingReportsCount: number;
  pendingClaimsCount: number;
  pendingFoundMatchCount: number;
}

function serializeNavigationUser(profile: NavigationProfile) {
  return {
    id: profile.id,
    name: profile.name,
    jabatan: profile.jabatan.toLowerCase().replace(/_/g, " "),
    avatarInitials: profile.name.substring(0, 2).toUpperCase(),
  };
}

export async function getUserNavigationSnapshot(
  profile: NavigationProfile
): Promise<UserNavigationSnapshot> {
  const [
    unreadCount,
    actionableReportsCount,
    actionableClaimsCount,
    pendingFoundReportsCount,
    approvedFoundMatchCount,
  ] = await Promise.all([
    prisma.notification.count({
      where: { userId: profile.id, isRead: false },
    }),
    prisma.report.count({
      where: {
        reporterId: profile.id,
        type: "LOST",
        status: { in: ["VERIFIED", "AWAITING_PICKUP"] },
        foundMatches: { some: { status: { in: ["APPROVED", "ITEM_RECEIVED"] } } },
      },
    }),
    prisma.claim.count({
      where: {
        claimantId: profile.id,
        status: "APPROVED",
      },
    }),
    prisma.report.count({
      where: {
        reporterId: profile.id,
        type: "FOUND",
        status: "PENDING",
      },
    }),
    prisma.foundMatch.count({
      where: {
        finderId: profile.id,
        status: "APPROVED",
      },
    }),
  ]);

  return {
    currentUser: serializeNavigationUser(profile),
    unreadCount,
    totalActionableBadge:
      actionableReportsCount +
      actionableClaimsCount +
      pendingFoundReportsCount +
      approvedFoundMatchCount,
  };
}

export async function getAdminNavigationSnapshot(
  profile: NavigationProfile
): Promise<AdminNavigationSnapshot> {
  const [unreadCount, pendingReportsCount, pendingClaimsCount, pendingFoundMatchCount] =
    await Promise.all([
      prisma.notification.count({
        where: { userId: profile.id, isRead: false },
      }),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.claim.count({ where: { status: "PENDING" } }),
      prisma.foundMatch.count({ where: { status: "PENDING" } }),
    ]);

  return {
    currentUser: serializeNavigationUser(profile),
    unreadCount,
    pendingReportsCount,
    pendingClaimsCount,
    pendingFoundMatchCount,
  };
}
