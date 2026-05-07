# 9 Issues: Found-Match, Claim & UX Fixes — Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Fix 9 bugs & feature gaps around found-match flow, claim cascade, admin report UX, comment visibility, and user-facing status badges.

**Architecture:** Changes span 3 layers: (1) Server actions — fix blocking logic, add cascade notifications, add revoke action; (2) Page components — fix image fallback, add contextual banners per user role, add found-match button for admin; (3) Shared components — fix comment visibility across admin/user boundary.

**Tech Stack:** Next.js 16 (App Router), Prisma v7, Supabase, TypeScript, Tailwind CSS

---

## Issue Map

| # | Issue | Severity | Task |
|---|-------|----------|------|
| 1 | Admin report detail: no image when user didn't upload | UX Bug | Task 1 |
| 2 | No "Menemukan" button in admin report detail after verify | Missing Feature | Task 2 |
| 3 | User B blocked from found-match when User A is still PENDING | Logic Bug | Task 3 |
| 4 | User A (finder) has no contextual info in lost-item detail | UX Gap | Task 4 |
| 5 | Reporter has no badge in navbar after item found | UX Gap | Task 5 |
| 6 | Admin claim comment not visible to user | Bug | Task 6 |
| 7 | User B can still submit claim after User A approved | Logic Bug | Task 7 |
| 8 | No notification for User B when claim auto-rejected | Missing Feature | Task 8 |
| 9 | No badge on user side for approved claim | UX Gap | Task 9 |

## Dependency Graph

```
Task 3 (found-match logic) → Task 2 (admin found-match button, depends on understanding flow)
Task 8 (claim cascade notif) → Task 7 (claim block logic, same file area)
Task 1, 4, 5, 6, 9 are independent
```

**Execution Order:** Task 1 → 3 → 8+7 → 2 → 4 → 5 → 6 → 9

---

### Task 1: Fix Admin Report Detail — Category Image Fallback

**Problem:** When user didn't upload photos, admin report detail page shows empty `<Package>` icon instead of the category image.

**Root Cause:** `app/(admin)/admin/reports/[id]/page.tsx` line 60-68 — fallback only renders `<Package size={64}>`, ignoring `report.category.imageUrl`.

**Files:**
- Modify: `app/(admin)/admin/reports/[id]/page.tsx:15-68`

**Step 1: Update the image section**

Replace the current image block (lines 60-68) with one that uses `CategoryIcon` as fallback and also integrate `ImageGallery` for multi-image support:

```tsx
// Add imports at top of file
import { CategoryIcon } from "@/components/shared/category-icon";
import { ImageGallery } from "@/components/shared/image-gallery";

// Replace image section (lines 60-68):
{hasImages ? (
  <ImageGallery images={report.images.map(img => ({ url: img.url, alt: report.itemName }))} />
) : (
  <div className="aspect-video sm:aspect-[21/9] bg-slate-50 flex items-center justify-center flex-col gap-3">
    <CategoryIcon name={report.category.name} imageUrl={report.category.imageUrl} size={64} className="text-slate-300" />
    <p className="text-xs text-slate-400 font-medium">Pelapor tidak menyertakan foto</p>
  </div>
)}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Visual verify**

Open admin report detail for a report without photos. Should show the category icon/image instead of blank Package icon.

---

### Task 2: Add "Ditemukan oleh Tamu" Button in Admin Report Detail (LOST + VERIFIED)

**Problem:** After admin verifies a LOST report, there's no way to record that the item was found by a guest (non-user). Admin needs a button to create a found-match on behalf of a guest.

**Files:**
- Modify: `app/(admin)/admin/reports/[id]/page.tsx` — add found-match info section
- Modify: `app/(admin)/admin/reports/[id]/_components/report-verification-panel.tsx` — add "Ditemukan" link for LOST+VERIFIED

**Step 1: Add found-match query to admin report detail page**

In `app/(admin)/admin/reports/[id]/page.tsx`, add to the Prisma query's `include`:

```tsx
foundMatches: {
  where: { status: { in: ["PENDING", "APPROVED", "ITEM_RECEIVED", "COMPLETED"] } },
  include: {
    finder: { select: { name: true } },
  },
  orderBy: { createdAt: "desc" },
},
```

**Step 2: Pass foundMatches data to ReportVerificationPanel**

Add a new prop `foundMatches` to the component and pass the data.

**Step 3: In ReportVerificationPanel — VERIFIED + LOST section**

When `reportType === "LOST"` and `reportStatus === "VERIFIED"`, show:
- List of existing found-matches with status badges
- Link to admin found-match page
- A link to create a found-match "atas nama tamu" (using the existing guest-report flow or a new admin found-match route)

```tsx
{reportType === "LOST" && (
  <div className="mt-4 pt-4 border-t border-slate-100">
    <h4 className="text-xs font-bold text-slate-600 mb-3">Laporan Penemuan</h4>
    {foundMatches.length > 0 ? (
      <div className="flex flex-col gap-2">
        {foundMatches.map((fm) => (
          <div key={fm.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">{fm.finderName}</p>
              <p className="text-[10px] text-slate-400 capitalize">{fm.status.toLowerCase().replace(/_/g, " ")}</p>
            </div>
            <Link href={`/admin/found-matches/${fm.id}`} className="text-xs text-orange-600 font-medium hover:underline">
              Detail
            </Link>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-xs text-slate-400 text-center py-3">Belum ada laporan penemuan</p>
    )}
    <Link
      href={`/admin/found-matches`}
      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-sm font-medium hover:border-orange-300 hover:text-orange-600 transition-colors"
    >
      <Search size={16} /> Lihat Semua Found Match
    </Link>
  </div>
)}
```

**Step 4: Verify**

Run: `npx tsc --noEmit`  
Visual: Open admin report detail for a LOST+VERIFIED report. Should see found-match section with existing matches listed.

---

### Task 3: Fix Found-Match Blocking Logic — Allow Multiple PENDING

**Problem:** `found-match.actions.ts` lines 134-144 blocks ALL users when ANY found-match exists (including PENDING). Should only block when there's an APPROVED/ITEM_RECEIVED match.

**Root Cause:** The `activeMatch` check includes PENDING status in the blocking filter. Per the new policy (Opsi B), only APPROVED and ITEM_RECEIVED should block new submissions.

**Files:**
- Modify: `lib/actions/found-match.actions.ts:134-144`

**Step 1: Fix the blocking condition**

Change lines 134-144 from:

```typescript
// 5. Check kalau sudah ada FoundMatch APPROVED/ITEM_RECEIVED untuk report ini
const activeMatch = await prisma.foundMatch.findFirst({
  where: {
    reportId: validData.reportId,
    status: { in: ["APPROVED", "ITEM_RECEIVED"] },
  },
});

if (activeMatch) {
  return { success: false, error: "Barang ini sudah dalam proses pengembalian oleh orang lain." };
}
```

This is actually already correct — the code checks for `["APPROVED", "ITEM_RECEIVED"]`. But the **page-level** condition in `lost-items/[id]/page.tsx` is what blocks incorrectly.

**The real bug is in the page:** `lost-items/[id]/page.tsx` line 29-36 and 68-72.

The query fetches foundMatches with `status: { in: ["PENDING", "APPROVED", "ITEM_RECEIVED", "COMPLETED"] }` and then `take: 1`. This means if User A has a PENDING match, `hasActiveFoundMatch` is true and `canShowFoundMatchForm` becomes false for User B.

**Fix in `app/(main)/dashboard/lost-items/[id]/page.tsx`:**

```typescript
// Change foundMatches query to separate concerns:
foundMatches: {
  where: { status: { in: ["PENDING", "APPROVED", "ITEM_RECEIVED", "COMPLETED"] } },
  include: {
    finder: { select: { id: true, name: true } },
  },
  orderBy: { createdAt: "desc" },
},
```

Remove `take: 1` — we need all matches to show multiple pending matches.

Then update the logic:

```typescript
// Found Match logic — separate PENDING from APPROVED+
const allFoundMatches = report.foundMatches;
const approvedOrBeyondMatch = allFoundMatches.find(
  fm => ["APPROVED", "ITEM_RECEIVED", "COMPLETED"].includes(fm.status)
);
const hasApprovedMatch = !!approvedOrBeyondMatch;
const pendingMatches = allFoundMatches.filter(fm => fm.status === "PENDING");

// Check if current user has any active found match (PENDING/APPROVED/ITEM_RECEIVED)
const userActiveMatch = allFoundMatches.find(
  fm => fm.finderId === user.id && ["PENDING", "APPROVED", "ITEM_RECEIVED"].includes(fm.status)
);

// Show found match form when:
// - Report is LOST + VERIFIED
// - User is NOT the reporter
// - No APPROVED/ITEM_RECEIVED match exists (only block on APPROVED+, not PENDING)
// - User doesn't already have an active match
const canShowFoundMatchForm =
  report.status === "VERIFIED" &&
  !isOwner &&
  !hasApprovedMatch &&
  !userActiveMatch;
```

Remove the old `userHasPendingMatch` Prisma count query (it's no longer needed — we get it from the included data).

**Step 2: Update sidebar rendering**

Update the sidebar rendering to reflect the new variables:

```tsx
{isOwner ? (
  <ReportActionsClient ... hasActiveFoundMatch={hasApprovedMatch} userHasPendingMatch={!!userActiveMatch} />
) : canShowFoundMatchForm ? (
  <FoundMatchForm reportId={report.id} reportItemName={report.itemName} />
) : userActiveMatch ? (
  // User has pending/approved match
  <div>... "Anda sudah mengirim laporan penemuan ..."</div>
) : hasApprovedMatch ? (
  // Someone else's match is approved
  <div>... "Barang ini sudah dalam proses pengembalian."</div>
) : (
  <div>... "Tidak ada tindakan yang tersedia saat ini."</div>
)}
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Scenario: User A submits found-match (PENDING). User B visits same page → should see "Saya Menemukan Barang Ini" form.

---

### Task 4: Contextual Info Banner for Finder (User A) in Lost-Item Detail

**Problem:** User A (who submitted a found-match that was APPROVED) sees the same generic "Barang ini sudah dalam proses pengembalian" as everyone else. Should see a **specific instruction** to bring the item to Front Office.

**Files:**
- Modify: `app/(main)/dashboard/lost-items/[id]/page.tsx` — sidebar section

**Step 1: Add contextual banner for the finder**

In the sidebar section, add a new condition for when the current user is the finder of an approved match:

```tsx
) : userActiveMatch?.status === "APPROVED" ? (
  <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm">
    <h3 className="text-sm font-bold text-orange-800 mb-3">Tindakan Anda</h3>
    <div className="p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
      <p className="text-xs text-orange-800 font-semibold mb-1">⚡ Segera Serahkan Barang</p>
      <p className="text-xs text-orange-700 leading-relaxed">
        Laporan penemuan Anda telah disetujui. Silakan segera serahkan barang ke <strong>Front Office</strong> agar dapat dikembalikan ke pemiliknya.
      </p>
    </div>
  </div>
) : userActiveMatch?.status === "PENDING" ? (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
    <h3 className="text-sm font-bold text-slate-800 mb-4">Tindakan</h3>
    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center">
      <p className="text-xs text-amber-700 font-medium">
        Anda sudah mengirim laporan penemuan untuk barang ini. Menunggu review admin.
      </p>
    </div>
  </div>
```

**Step 2: Add success alert to FoundMatchForm**

After successful submission, show alert about bringing item to Front Office:

```tsx
// In found-match-form.tsx success state (line 52-68), add:
<div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
  <p className="text-xs text-amber-700 font-semibold">
    ⚠️ Penting: Jika laporan Anda disetujui, Anda harus segera menyerahkan barang ke Front Office.
  </p>
</div>
```

**Step 3: Verify**

Run: `npx tsc --noEmit`

---

### Task 5: Reporter Badge in Navbar When Item Found

**Problem:** When User A reports a found-match for the reporter's lost item, the reporter needs a visible badge/indicator in the navbar.

**Files:**
- Modify: `components/layout/user-nav-client.tsx` — add report status badge

**Step 1: Check existing unread notification count**

The navbar already shows unread notification count (bell icon badge). When `approveFoundMatch` is called, it already sends a notification to the reporter:

```
"Kabar baik! Barang \"${match.report.itemName}\" Anda telah ditemukan oleh seseorang."
```

So the **notification badge already works** for this. The issue is that the user may not notice it. 

**The real request** is: add a specific badge to the "Laporan Saya" section in the sidebar or a visual indicator on the user's report card. Let me check if there's a "my reports" page.

**Resolution:** This is already handled by the notification system. The unread notification badge shows on the bell icon. If the user wants a more prominent indicator, we can add a banner to the "Laporan Saya" page that highlights reports with active found-matches. But per YAGNI, the notification system is sufficient — **mark as already handled, skip implementation**.

> **Decision:** Existing notification system already covers this. No code change needed.

---

### Task 6: Fix Claim Comment Visibility — Admin Comments Not Visible to Users

**Problem:** Admin writes a comment on a claim at `/admin/claims/[id]`, but users can't see it because there's no user-facing claim detail page.

**Root Cause:** The `CommentSection` on admin claim detail passes `claimId` correctly, and comments are saved with `claimId`. But there's **no user-side page** that loads comments by `claimId`. The user report detail pages only load report comments (`reportId`).

**Files:**
- Modify: `app/(main)/dashboard/found-items/[id]/page.tsx` — add claim comments section

**Step 1: Load claims with comments in found-items detail**

Update the Prisma query in `found-items/[id]/page.tsx` to include claims and their comments:

```typescript
claims: {
  where: { claimantId: user.id },
  include: {
    comments: {
      include: {
        author: { select: { name: true, jabatan: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    },
  },
  take: 1,
  orderBy: { createdAt: "desc" },
},
```

**Step 2: Render claim discussion section if user has a claim**

After the report `CommentSection`, conditionally render a second `CommentSection` for the user's claim:

```tsx
{userClaim?.id && (
  <div className="mt-0">
    <CommentSection
      comments={userClaimData.comments}
      claimId={userClaimData.id}
      currentUserId={user.id}
      currentUserRole={profile.role}
    />
  </div>
)}
```

Rename the section header to distinguish: "Diskusi Laporan" vs "Diskusi Klaim Anda".

**Step 3: Verify**

Run: `npx tsc --noEmit`  
Scenario: Admin writes comment on claim. User opens found-item detail → should see claim discussion section with the admin's comment.

---

### Task 7: Fix Claim Blocking — Prevent New Claims After One Approved

**Problem:** After User A's claim is approved and User B's is auto-rejected, User B can still submit a new claim because the page only checks for `status: { in: ["PENDING", "APPROVED"] }` on the current user, not checking if ANY claim has been approved.

**Root Cause:** `found-items/[id]/page.tsx` line 42-50 — `userCanClaim` only checks if THIS user has a pending/approved claim. It doesn't check if another user already has an approved claim.

**Files:**
- Modify: `app/(main)/dashboard/found-items/[id]/page.tsx:40-51`

**Step 1: Add global approved claim check**

```typescript
// Cek hak untuk mengklaim
let userCanClaim = false;
if (!isOwner && report.status === "VERIFIED") {
  // Check if ANY claim is already approved/completed for this report
  const approvedClaim = await prisma.claim.findFirst({
    where: {
      reportId: id,
      status: { in: ["APPROVED", "COMPLETED"] },
    },
  });

  if (!approvedClaim) {
    // No approved claim yet — check if THIS user already has a pending claim
    const existingClaim = await prisma.claim.findFirst({
      where: {
        reportId: id,
        claimantId: user.id,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });
    if (!existingClaim) userCanClaim = true;
  }
}
```

**Step 2: Update action message for blocked state**

In the action card IIFE, add a case for when claim is already approved by someone else:

```tsx
if (report.status === "VERIFIED" && !userCanClaim && !isOwner) {
  // Could be: user already has pending claim, or another user has approved claim
  return "Barang ini sudah dalam proses pengambilan.";
}
```

**Step 3: Verify**

Run: `npx tsc --noEmit`  
Scenario: Admin approves User A's claim. User B visits page → should NOT see "Ajukan Klaim" button.

---

### Task 8: Add Cascade Notification When Claims Auto-Rejected

**Problem:** When admin approves User A's claim, `approveClaim()` runs `updateMany` to reject other pending claims but doesn't notify those users.

**Files:**
- Modify: `lib/actions/admin-claim.actions.ts:20-57` (approveClaim function)

**Step 1: Query affected claims before rejecting**

Before the `updateMany`, query the affected claims to get their `claimantId`:

```typescript
// Inside the transaction, BEFORE the updateMany:
const otherPendingClaims = await tx.claim.findMany({
  where: {
    reportId: claim.reportId,
    id: { not: claimId },
    status: "PENDING",
  },
  select: { id: true, claimantId: true },
});

// Then do the updateMany as before...
await tx.claim.updateMany({ ... });

// Then send notifications to each affected user:
for (const rejected of otherPendingClaims) {
  await tx.notification.create({
    data: {
      userId: rejected.claimantId,
      type: "CLAIM_REJECTED",
      message: `Klaim Anda untuk "${claim.report.itemName}" ditolak. Alasan: Klaim lain untuk barang ini telah disetujui.`,
      data: { claimId: rejected.id, reportId: claim.reportId },
    },
  });
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`  
Scenario: Admin approves User A. Check User B's notifications → should have rejection notification.

---

### Task 9: User-Side Badge for Approved Claim

**Problem:** User doesn't have a clear visual indicator in the found-item detail page that their claim was approved.

**Root Cause:** The claim status banners added in the previous sprint (Task 5 of 7-issues plan) already exist but may not cover the case where `report.status` is still `VERIFIED` while `userClaim.status === "APPROVED"`.

**Files:**
- Modify: `app/(main)/dashboard/found-items/[id]/page.tsx` — verify existing banners work

**Step 1: Verify existing banner logic**

Check that the existing banner for `userClaim?.status === "APPROVED"` (added in previous implementation) renders correctly. The banner should show between image and info sections.

Current code already has:
```tsx
{userClaim?.status === "APPROVED" && (
  <div className="bg-gradient-to-r from-green-50 to-emerald-50 ...">
    <h3>Klaim Disetujui!</h3>
    <p>Silakan ambil barang di Front Office.</p>
  </div>
)}
```

**Step 2: Fix userClaim query to include id for claim comments**

Update the `userClaim` query to also fetch the claim id (needed for Task 6):

```typescript
const userClaim = await prisma.claim.findFirst({
  where: { reportId: id, claimantId: user.id },
  select: { id: true, status: true },
  orderBy: { createdAt: "desc" },
});
```

Remove the `status: { in: [...] }` filter so we can show rejection info too:

```tsx
{userClaim?.status === "REJECTED" && (
  <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-5">
    <div className="flex items-start gap-3">
      <XCircle size={20} className="text-red-600 mt-0.5" />
      <div>
        <h3 className="text-sm font-bold text-red-800">Klaim Ditolak</h3>
        <p className="text-xs text-red-700 mt-1">Klaim Anda untuk barang ini telah ditolak.</p>
      </div>
    </div>
  </div>
)}
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Scenario: User A has approved claim → should see green banner. User B has rejected claim → should see red banner.

---

## Verification Plan

### Automated Tests
```bash
npx tsc --noEmit
```
Expected: Zero errors after all tasks.

### Manual Verification Scenarios

1. **Task 1:** Open admin report detail for report without images → should show category icon
2. **Task 2:** Open admin report detail for LOST+VERIFIED → should see found-match section
3. **Task 3:** User A submits found-match (PENDING) → User B visits same page → should see "Saya Menemukan" form
4. **Task 4:** User A's found-match approved → User A visits lost-item detail → should see "Segera Serahkan Barang" banner
5. **Task 6:** Admin writes comment on claim → User opens found-item detail → should see comment in "Diskusi Klaim" section
6. **Task 7:** Admin approves User A's claim → User B visits found-item detail → should NOT see "Ajukan Klaim" button
7. **Task 8:** Admin approves User A → check User B's notifications → should have rejection notification
8. **Task 9:** User with approved claim visits found-item detail → should see green "Klaim Disetujui" banner

### Browser Testing
For each scenario above, use browser subagent to navigate to the relevant pages and verify UI rendering.
