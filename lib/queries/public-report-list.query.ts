import type { Prisma, ReportType } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import {
  getPublicStatusesForGroup,
  PUBLIC_ACTIVE_REPORT_STATUSES,
  PUBLIC_DONE_REPORT_STATUSES,
} from "@/lib/utils/report-visibility";
import {
  buildPaginationMeta,
  type PaginatedResult,
  type PaginationMeta,
} from "@/lib/types/pagination";

export const PUBLIC_REPORT_PAGE_SIZE = 24;

export interface PublicReportListItem {
  id: string;
  type: ReportType;
  status: string;
  itemName: string;
  location: string;
  date: string;
  category: { name: string; imageUrl?: string };
  reportImageUrl?: string;
}

export interface PublicReportListFilters {
  type: ReportType;
  page?: string | number;
  q?: string;
  status?: string;
  category?: string;
  pageSize?: number;
}

export interface PublicReportListResult
  extends PaginatedResult<PublicReportListItem> {
  categories: { name: string }[];
  counts: {
    all: number;
    active: number;
    done: number;
  };
  filters: {
    q: string;
    status: "all" | "active" | "done";
    categories: string[];
  };
}

function parsePage(page: PublicReportListFilters["page"]) {
  const parsed = Number(page ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function parseCategories(category: string | undefined) {
  return (category ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeStatusGroup(status: string | undefined) {
  if (status === "active" || status === "done") return status;
  return "all";
}

function buildBaseWhere({
  type,
  q,
  categories,
}: {
  type: ReportType;
  q: string;
  categories: string[];
}): Prisma.ReportWhereInput {
  return {
    type,
    ...(q
      ? {
          OR: [
            { itemName: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(categories.length > 0
      ? { category: { name: { in: categories } } }
      : {}),
  };
}

function withStatus(
  where: Prisma.ReportWhereInput,
  status: Prisma.ReportWhereInput["status"]
): Prisma.ReportWhereInput {
  return { ...where, status };
}

export async function getPublicReportList({
  type,
  page,
  q,
  status,
  category,
  pageSize = PUBLIC_REPORT_PAGE_SIZE,
}: PublicReportListFilters): Promise<PublicReportListResult> {
  const currentPage = parsePage(page);
  const search = (q ?? "").trim();
  const selectedCategories = parseCategories(category);
  const statusGroup = normalizeStatusGroup(status);
  const baseWhere = buildBaseWhere({ type, q: search, categories: selectedCategories });
  const listWhere = withStatus(baseWhere, {
    in: getPublicStatusesForGroup(statusGroup),
  });

  const [totalItems, activeCount, doneCount, reports, categories] =
    await Promise.all([
      prisma.report.count({
        where: withStatus(baseWhere, { in: getPublicStatusesForGroup("all") }),
      }),
      prisma.report.count({
        where: withStatus(baseWhere, { in: [...PUBLIC_ACTIVE_REPORT_STATUSES] }),
      }),
      prisma.report.count({
        where: withStatus(baseWhere, { in: [...PUBLIC_DONE_REPORT_STATUSES] }),
      }),
      prisma.report.findMany({
        where: listWhere,
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
          category: { select: { name: true, imageUrl: true } },
          images: {
            take: 1,
            orderBy: { createdAt: "asc" },
            select: { url: true },
          },
        },
      }),
      prisma.category.findMany({
        select: { name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const pagination: PaginationMeta = buildPaginationMeta({
    page: currentPage,
    pageSize,
    totalItems,
  });

  return {
    items: reports.map((report) => ({
      id: report.id,
      type: report.type,
      status: report.status,
      itemName: report.itemName,
      location: report.location,
      date: report.date.toISOString(),
      category: {
        name: report.category.name,
        imageUrl: report.category.imageUrl || undefined,
      },
      reportImageUrl: report.images[0]?.url,
    })),
    categories,
    counts: {
      all: totalItems,
      active: activeCount,
      done: doneCount,
    },
    filters: {
      q: search,
      status: statusGroup,
      categories: selectedCategories,
    },
    pagination,
  };
}

