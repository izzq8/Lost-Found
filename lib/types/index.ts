// Type definitions yang digunakan di seluruh aplikasi
// Import Prisma types dari generated client

import type {
  Profile,
  Report,
  Claim,
  Comment,
  Category,
  Notification,
  Announcement,
  AuditLog,
  EnrollmentCode,
  ReportImage,
  ClaimImage,
  PasswordResetRequest,
} from "@prisma/client";

// Re-export Prisma types untuk kemudahan import
export type {
  Profile,
  Report,
  Claim,
  Comment,
  Category,
  Notification,
  Announcement,
  AuditLog,
  EnrollmentCode,
  ReportImage,
  ClaimImage,
  PasswordResetRequest,
};

// === Extended Types (dengan relasi) ===

/** Report dengan relasi category, reporter, images */
export type ReportWithRelations = Report & {
  category: Category;
  reporter: Profile;
  images: ReportImage[];
  claims?: Claim[];
  comments?: Comment[];
};

/** Claim dengan relasi report, claimant, images */
export type ClaimWithRelations = Claim & {
  report: ReportWithRelations;
  claimant: Profile;
  images: ClaimImage[];
  comments?: Comment[];
};

/** Comment dengan relasi author */
export type CommentWithAuthor = Comment & {
  author: Profile;
};

// === API Response Types ===

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

// === UI Types ===

export type ViewMode = "grid" | "list";

export type SortOrder = "newest" | "oldest";

export type ReportFilter = {
  search?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: SortOrder;
};
