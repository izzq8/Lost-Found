import type {
  AccountStatus,
  ClaimStatus,
  Jabatan,
  Prisma,
  ReportStatus,
  ReportType,
  Role,
} from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { buildPaginationMeta, type PaginatedResult } from "@/lib/types/pagination";

export const ADMIN_LIST_PAGE_SIZE = 25;

const REPORT_STATUS_TABS = [
  "PENDING",
  "VERIFIED",
  "AWAITING_PICKUP",
  "CLAIMED",
  "REJECTED",
  "EXPIRED",
  "RESOLVED",
] as const satisfies readonly ReportStatus[];

const CLAIM_STATUS_TABS = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
] as const satisfies readonly ClaimStatus[];

function parsePage(page: string | number | undefined) {
  const parsed = Number(page ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function parseCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyToUndefined(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "all" || trimmed === "Semua") return undefined;
  return trimmed;
}

export interface AdminListFilters {
  page?: string | number;
  q?: string;
  status?: string;
  category?: string;
  type?: string;
  role?: string;
  jabatan?: string;
  pageSize?: number;
}

export interface AdminReportListItem {
  id: string;
  type: string;
  status: string;
  itemName: string;
  category: string;
  categoryImageUrl: string | null;
  imageUrl: string | null;
  location: string;
  date: string;
  createdAt: string;
  reporterName: string;
  reporterJabatan: string;
  finderName: string | null;
  claimantName: string | null;
  handoverPhotoUrl: string | null;
  pickupPhotoUrl: string | null;
}

export interface AdminClaimListItem {
  id: string;
  status: string;
  claimantName: string;
  claimantJabatan: string;
  itemName: string;
  category: string;
  imageUrl: string | null;
  categoryImageUrl: string | null;
  createdAt: string;
  handoverPhotoUrl: string | null;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  jabatan: string;
  role: string;
  status: string;
  createdAt: string;
  avatarInitials: string;
}

export interface AdminReportsResult
  extends PaginatedResult<AdminReportListItem> {
  categories: { name: string }[];
  counts: Record<string, number>;
  filters: { q: string; status: string; categories: string[]; types: string[] };
}

export interface AdminClaimsResult extends PaginatedResult<AdminClaimListItem> {
  categories: { name: string }[];
  counts: Record<string, number>;
  filters: { q: string; status: string; categories: string[] };
}

export interface AdminUsersResult extends PaginatedResult<AdminUserListItem> {
  counts: { active: number; inactive: number };
  filters: { q: string; status: string; role: string; jabatan: string };
}

export async function getAdminReportsList({
  page,
  q,
  status,
  category,
  type,
  pageSize = ADMIN_LIST_PAGE_SIZE,
}: AdminListFilters): Promise<AdminReportsResult> {
  const currentPage = parsePage(page);
  const search = (q ?? "").trim();
  const selectedCategories = parseCsv(category);
  const selectedTypes = parseCsv(type).filter((value): value is ReportType =>
    value === "LOST" || value === "FOUND"
  );
  const selectedStatus = emptyToUndefined(status) as ReportStatus | undefined;

  const baseWhere: Prisma.ReportWhereInput = {
    ...(selectedTypes.length > 0 ? { type: { in: selectedTypes } } : {}),
    ...(selectedCategories.length > 0
      ? { category: { name: { in: selectedCategories } } }
      : {}),
    ...(search
      ? {
          OR: [
            { itemName: { contains: search, mode: "insensitive" } },
            { reporter: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const where: Prisma.ReportWhereInput = {
    ...baseWhere,
    ...(selectedStatus ? { status: selectedStatus } : {}),
  };

  const [totalItems, reports, categories, allCount, ...statusCounts] =
    await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          type: true,
          status: true,
          itemName: true,
          location: true,
          date: true,
          createdAt: true,
          reporter: { select: { name: true, jabatan: true } },
          category: { select: { name: true, imageUrl: true } },
          images: { take: 1, select: { url: true } },
          foundMatches: {
            where: { status: { in: ["APPROVED", "ITEM_RECEIVED", "COMPLETED"] } },
            select: {
              finder: { select: { name: true } },
              handoverPhotoUrl: true,
              pickupPhotoUrl: true,
            },
            take: 1,
          },
          claims: {
            where: { status: { in: ["APPROVED", "COMPLETED"] } },
            select: {
              claimant: { select: { name: true } },
              handoverPhotoUrl: true,
            },
            take: 1,
          },
        },
      }),
      prisma.category.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
      prisma.report.count({ where: baseWhere }),
      ...REPORT_STATUS_TABS.map((tabStatus) =>
        prisma.report.count({ where: { ...baseWhere, status: tabStatus } })
      ),
    ]);

  return {
    items: reports.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      itemName: r.itemName,
      category: r.category.name,
      categoryImageUrl: r.category.imageUrl,
      imageUrl: r.images[0]?.url ?? null,
      location: r.location,
      date: r.date.toISOString(),
      createdAt: r.createdAt.toISOString(),
      reporterName: r.reporter.name,
      reporterJabatan: r.reporter.jabatan,
      finderName: r.foundMatches[0]?.finder?.name || null,
      claimantName: r.claims[0]?.claimant?.name || null,
      handoverPhotoUrl: r.foundMatches[0]?.handoverPhotoUrl || r.claims[0]?.handoverPhotoUrl || null,
      pickupPhotoUrl: r.foundMatches[0]?.pickupPhotoUrl || null,
    })),
    categories,
    counts: Object.fromEntries([
      ["Semua", allCount],
      ...REPORT_STATUS_TABS.map((tabStatus, index) => [tabStatus, statusCounts[index] ?? 0]),
    ]),
    filters: {
      q: search,
      status: selectedStatus ?? "Semua",
      categories: selectedCategories,
      types: selectedTypes,
    },
    pagination: buildPaginationMeta({ page: currentPage, pageSize, totalItems }),
  };
}

export async function getAdminClaimsList({
  page,
  q,
  status,
  category,
  pageSize = ADMIN_LIST_PAGE_SIZE,
}: AdminListFilters): Promise<AdminClaimsResult> {
  const currentPage = parsePage(page);
  const search = (q ?? "").trim();
  const selectedCategories = parseCsv(category);
  const selectedStatus = emptyToUndefined(status) as ClaimStatus | undefined;

  const baseWhere: Prisma.ClaimWhereInput = {
    ...(selectedCategories.length > 0
      ? { report: { category: { name: { in: selectedCategories } } } }
      : {}),
    ...(search
      ? {
          OR: [
            { claimant: { name: { contains: search, mode: "insensitive" } } },
            { report: { itemName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const where: Prisma.ClaimWhereInput = {
    ...baseWhere,
    ...(selectedStatus ? { status: selectedStatus } : {}),
  };

  const [totalItems, claims, categories, allCount, ...statusCounts] =
    await Promise.all([
      prisma.claim.count({ where }),
      prisma.claim.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          status: true,
          createdAt: true,
          handoverPhotoUrl: true,
          claimant: { select: { name: true, jabatan: true } },
          report: {
            select: {
              itemName: true,
              category: { select: { name: true, imageUrl: true } },
              images: { take: 1, select: { url: true } },
            },
          },
        },
      }),
      prisma.category.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
      prisma.claim.count({ where: baseWhere }),
      ...CLAIM_STATUS_TABS.map((tabStatus) =>
        prisma.claim.count({ where: { ...baseWhere, status: tabStatus } })
      ),
    ]);

  return {
    items: claims.map((c) => ({
      id: c.id,
      status: c.status,
      claimantName: c.claimant.name,
      claimantJabatan: c.claimant.jabatan,
      itemName: c.report.itemName,
      category: c.report.category.name,
      imageUrl: c.report.images[0]?.url ?? null,
      categoryImageUrl: c.report.category.imageUrl,
      createdAt: c.createdAt.toISOString(),
      handoverPhotoUrl: c.handoverPhotoUrl || null,
    })),
    categories,
    counts: Object.fromEntries([
      ["Semua", allCount],
      ...CLAIM_STATUS_TABS.map((tabStatus, index) => [tabStatus, statusCounts[index] ?? 0]),
    ]),
    filters: {
      q: search,
      status: selectedStatus ?? "Semua",
      categories: selectedCategories,
    },
    pagination: buildPaginationMeta({ page: currentPage, pageSize, totalItems }),
  };
}

export async function getAdminUsersList({
  page,
  q,
  status,
  role,
  jabatan,
  pageSize = ADMIN_LIST_PAGE_SIZE,
}: AdminListFilters): Promise<AdminUsersResult> {
  const currentPage = parsePage(page);
  const search = (q ?? "").trim();
  const selectedStatus = (emptyToUndefined(status) ?? "ACTIVE") as AccountStatus;
  const selectedRole = emptyToUndefined(role) as Role | undefined;
  const selectedJabatan = emptyToUndefined(jabatan) as Jabatan | undefined;

  const baseWhere: Prisma.ProfileWhereInput = {
    ...(selectedRole ? { role: selectedRole } : {}),
    ...(selectedJabatan ? { jabatan: selectedJabatan } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const where: Prisma.ProfileWhereInput = {
    ...baseWhere,
    status: selectedStatus,
  };

  const [totalItems, users, activeCount, inactiveCount] = await Promise.all([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        jabatan: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.profile.count({ where: { ...baseWhere, status: "ACTIVE" } }),
    prisma.profile.count({ where: { ...baseWhere, status: "DEACTIVATED" } }),
  ]);

  return {
    items: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      jabatan: u.jabatan,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
      avatarInitials: u.name.substring(0, 2).toUpperCase(),
    })),
    counts: { active: activeCount, inactive: inactiveCount },
    filters: {
      q: search,
      status: selectedStatus,
      role: selectedRole ?? "all",
      jabatan: selectedJabatan ?? "all",
    },
    pagination: buildPaginationMeta({ page: currentPage, pageSize, totalItems }),
  };
}

