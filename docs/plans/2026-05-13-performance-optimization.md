# Performance Optimization Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Improve LostFound SMKFN performance by reducing heavy queries, RSC/client payload, excessive realtime refreshes, image cost, and repeated layout work.

**Architecture:** Deepen the report listing, navigation snapshot, realtime invalidation, and image rendering modules so query rules and serialization live behind small interfaces. Keep Prisma as the database adapter and avoid raw SQL per project rules.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7, Supabase, Tailwind CSS v4, next/image.

---

### Task 1: Public Report Visibility and Listing Query

**Files:**
- Create: `lib/types/pagination.ts`
- Create: `lib/utils/report-visibility.ts`
- Create: `lib/queries/public-report-list.query.ts`
- Modify: `app/(main)/dashboard/lost-items/page.tsx`
- Modify: `app/(main)/dashboard/found-items/page.tsx`
- Modify: `app/(main)/dashboard/lost-items/[id]/page.tsx`
- Modify: `app/(main)/dashboard/found-items/[id]/page.tsx`
- Modify: `components/shared/item-card.tsx`

**Steps:**
1. Add pagination and public report visibility types.
2. Add a public report list query module with server-side search, category, status-group, and pagination.
3. Replace public list pages so they fetch only public statuses and serialize Date values to ISO strings.
4. Guard detail pages so non-owner/non-admin users cannot view non-public reports by direct ID.
5. Run `npx tsc --noEmit`.

### Task 2: URL-Driven Public List Filters

**Files:**
- Modify: `app/(main)/dashboard/lost-items/_components/items-filter-client.tsx`
- Modify: `app/(main)/dashboard/found-items/_components/items-filter-client.tsx`

**Steps:**
1. Replace client-side array filtering with URL updates.
2. Keep tab labels `Semua`, `Aktif`, `Selesai`, but map them to public statuses only.
3. Add pagination controls driven by server result metadata.
4. Run `npx tsc --noEmit`.

### Task 3: Admin List Query Modules

**Files:**
- Create: `lib/queries/admin-list.query.ts`
- Modify: `app/(admin)/admin/reports/page.tsx`
- Modify: `app/(admin)/admin/claims/page.tsx`
- Modify: `app/(admin)/admin/users/page.tsx`
- Modify related client modules under each `_components/`.

**Steps:**
1. Move admin reports, claims, and users list data fetching into deep query modules.
2. Add server-side pagination and filters with a default page size of 25.
3. Replace client-side whole-array filtering with URL-driven filters.
4. Run `npx tsc --noEmit` and `npm run build`.

### Task 4: Navigation Snapshot and Realtime Invalidation

**Files:**
- Create: `lib/queries/navigation-snapshot.query.ts`
- Modify: `app/(main)/layout.tsx`
- Modify: `app/(admin)/admin/layout.tsx`
- Modify: `hooks/use-realtime-refresh.ts`
- Modify: `components/layout/user-nav-client.tsx`
- Modify: `components/admin/admin-layout-client.tsx`

**Steps:**
1. Create navigation snapshot query helpers using the profile returned by auth guards.
2. Remove duplicate profile fetches in layouts.
3. Narrow realtime subscriptions and avoid duplicate page/layout refreshes.
4. Run `npx tsc --noEmit`.

### Task 5: Image Pipeline and Render Cost

**Files:**
- Create: `components/shared/optimized-thumbnail.tsx`
- Create: `lib/utils/image-client.ts`
- Modify: `components/shared/category-icon.tsx`
- Modify list modules that still use raw `<img>`.
- Modify report, claim, and found-match form client modules.

**Steps:**
1. Replace thumbnail `<img>` usage with `next/image`.
2. Add client-side image resizing/compression before upload while preserving server validation.
3. Revoke preview object URLs on cleanup.
4. Reduce repeated `backdrop-blur` on long lists.
5. Run `npx tsc --noEmit` and `npm run build`.

### Task 6: Database Indexes and Admin Dashboard Bundle

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `app/(admin)/admin/page.tsx`
- Modify or create a chart lazy-load client wrapper under `app/(admin)/admin/_components/`.

**Steps:**
1. Add indexes for `Report(reporterId, createdAt)`, `Claim(claimantId, createdAt)`, `FoundMatch(finderId, createdAt)`, `Notification(userId, createdAt)`, `Notification(userId, isRead, createdAt)`, `FoundMatchImage(foundMatchId)`, `Profile(createdAt)`, and `Profile(status)`.
2. Run `npx prisma validate`.
3. Run `npx prisma db push`.
4. Make Recharts truly lazy-loaded from a client wrapper.
5. Run `npx tsc --noEmit` and `npm run build`.
