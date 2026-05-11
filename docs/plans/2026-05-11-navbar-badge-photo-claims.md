# Navbar Badge + Photo Documentation Claims Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Add actionable badge on "Riwayat" navbar link, animated cards for FOUND PENDING reports, photo column in admin claims table, and admin photo receipt for FOUND report verification.

**Architecture:** Server-side count queries in layout → pass combined badge to navbar components. Client-side animation via CSS classes. Prisma select extension for photo URLs in claims. Reuse existing `PhotoUploadModal` + `upload-photo.actions.ts` for admin FOUND receipt.

**Tech Stack:** Next.js, Prisma, Supabase Storage, Tailwind CSS

---

## Task 1: Navbar Badge on "Riwayat" (Desktop + Mobile)

**Files:**
- Modify: `app/(main)/layout.tsx:27-45`
- Modify: `components/layout/user-nav-client.tsx:220`
- Modify: `components/layout/mobile-bottom-nav.tsx:22,214-218`

### Step 1: Add `pendingFoundReportsCount` query to layout

In `app/(main)/layout.tsx`, add a 4th parallel query to count the user's FOUND reports with status PENDING (i.e. the user reported finding something, admin hasn't verified yet, user should go hand it over).

```typescript
// Add to the Promise.all on line 27:
prisma.report.count({
  where: {
    reporterId: user.id,
    type: "FOUND",
    status: "PENDING",
  },
}),
```

Destructure as `pendingFoundReportsCount` from the Promise.all result.

Compute `totalActionableBadge`:
```typescript
const totalActionableBadge = actionableReportsCount + actionableClaimsCount + pendingFoundReportsCount;
```

Pass `totalActionableBadge` to `UserNavClient` and `MobileBottomNav`.

### Step 2: Add badge to desktop navbar "Riwayat" link

In `components/layout/user-nav-client.tsx` line 220, replace the plain `NavLink` with the `DropdownMenu` component (or add a badge inline). Since "Riwayat" is a single link, the simplest approach is adding a badge span after the text:

Replace line 220:
```tsx
<NavLink href="/dashboard/my-reports" label="Riwayat" icon={FileText} />
```

With a custom inline element that renders the badge:
```tsx
<Link
  href="/dashboard/my-reports"
  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
    isActive('/dashboard/my-reports')
      ? 'bg-orange-500/15 text-orange-600'
      : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
  }`}
  style={{ fontSize: '14px', fontWeight: isActive('/dashboard/my-reports') ? 600 : 500 }}
>
  <FileText size={18} className="shrink-0" />
  <span>Riwayat</span>
  {totalActionableBadge > 0 && (
    <span className="ml-1 w-[18px] h-[18px] bg-green-500 text-white rounded-full flex items-center justify-center" style={{ fontSize: '10px', fontWeight: 700 }}>
      {totalActionableBadge}
    </span>
  )}
</Link>
```

### Step 3: Update mobile bottom nav badge

In `components/layout/mobile-bottom-nav.tsx`:

1. Change the interface prop from `actionableClaimsCount` to `totalActionableBadge`
2. Update the badge dot on line 214 to use `totalActionableBadge` and show a number instead of just a dot:

```tsx
{tab.href === "/dashboard/my-reports" && totalActionableBadge > 0 && !active && (
  <div className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
    <span style={{ fontSize: '9px', fontWeight: 700, color: 'white' }}>{totalActionableBadge}</span>
  </div>
)}
```

### Step 4: Update layout.tsx to pass new prop

In `app/(main)/layout.tsx`, update the component calls:
```tsx
<UserNavClient 
  currentUser={clientUser} 
  unreadCount={unreadCount} 
  totalActionableBadge={totalActionableBadge}
/>
// ...
<MobileBottomNav totalActionableBadge={totalActionableBadge} />
```

Remove old props `actionableReportsCount` and `actionableClaimsCount` from `UserNavClient` since they're now merged.

### Step 5: Build and verify

Run: `npx next build`
Expected: Exit code 0, no errors

### Step 6: Commit

```bash
git add -A
git commit -m "feat: add actionable badge on Riwayat nav (desktop + mobile)"
```

---

## Task 2: Animated Cards for FOUND PENDING Reports in Riwayat

**Files:**
- Modify: `app/(main)/dashboard/my-reports/page.tsx:101-170`

### Step 1: Add animated border + "Segera Serahkan" badge for FOUND PENDING

In the reports map (line 101+), add conditional styling for cards where `report.type === "FOUND" && report.status === "PENDING"`:

```tsx
const isFoundPending = report.type === "FOUND" && report.status === "PENDING";

// On the <Link> card, add conditional class/style:
className={`rounded-xl md:rounded-2xl p-4 flex gap-4 items-start transition-all hover:shadow-md cursor-pointer group ${
  isFoundPending ? 'ring-2 ring-green-400 animate-pulse' : ''
}`}
```

And next to the StatusBadge area, add a mini-badge:
```tsx
{isFoundPending && (
  <span className="shrink-0 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
    Segera Serahkan!
  </span>
)}
```

**Note:** `animate-pulse` on the card will create a subtle blink. If it's too aggressive, we can use a custom CSS animation on just the border glow instead.

### Step 2: Build and verify

Run: `npx next build`
Expected: Exit code 0

### Step 3: Commit

```bash
git add -A
git commit -m "feat: animated card + badge for FOUND PENDING in riwayat"
```

---

## Task 3: Photo Column in Admin Claims Table

**Files:**
- Modify: `app/(admin)/admin/claims/page.tsx:13-37`
- Modify: `app/(admin)/admin/claims/_components/admin-claims-client.tsx:11-21,117,127,159-160`

### Step 1: Extend Prisma query to fetch `handoverPhotoUrl`

In `app/(admin)/admin/claims/page.tsx`, update the Prisma query to select `handoverPhotoUrl`:

```typescript
const claims = await prisma.claim.findMany({
  orderBy: { createdAt: "desc" },
  include: {
    claimant: { select: { name: true, jabatan: true } },
    report: {
      select: {
        itemName: true,
        category: { select: { name: true, imageUrl: true } },
        images: { take: 1, select: { url: true } },
      },
    },
  },
});
```

Add `handoverPhotoUrl` to serialized data:
```typescript
handoverPhotoUrl: c.handoverPhotoUrl || null,
```

### Step 2: Update client interface and table

In `admin-claims-client.tsx`:

1. Add `handoverPhotoUrl: string | null` to `ClaimItem` interface
2. Update column headers to include "Dok. Foto":
```tsx
{["#", "Gambar", "Tanggal", "Pengklaim", "Barang Diklaim", "Kategori", "Status", "Dok. Foto", "Aksi"].map(...)}
```
3. Update colSpan from 8 to 9
4. Add photo cell before the "Aksi" column:
```tsx
<td className="px-4 py-3">
  {c.handoverPhotoUrl ? (
    <a href={c.handoverPhotoUrl} target="_blank" rel="noopener noreferrer" title="Foto Serah Terima">
      <img src={c.handoverPhotoUrl} alt="Serah Terima" className="w-8 h-8 rounded object-cover border border-slate-200 hover:ring-2 hover:ring-orange-300 transition-all" />
    </a>
  ) : (
    <span className="text-xs text-slate-300">—</span>
  )}
</td>
```

### Step 3: Build and verify

Run: `npx next build`
Expected: Exit code 0

### Step 4: Commit

```bash
git add -A
git commit -m "feat: add Dok. Foto column to admin claims table"
```

---

## Task 4: Admin Photo Receipt for FOUND Report Verification

**Context:** When admin verifies/approves a FOUND report, they should confirm they have physically received the item. The current verification panel has a checkbox "Barang sudah diterima di front office" but no mandatory photo input.

**Files:**
- Modify: `app/(admin)/admin/reports/[id]/_components/report-verification-panel.tsx` (FOUND verification section)

### Step 1: Investigate current FOUND verification flow

The verification panel in `report-verification-panel.tsx` handles FOUND reports with a checkbox. Look for the section that handles `reportType === "FOUND"` and status `"PENDING"`.

Add the `PhotoUploadModal` to the FOUND verification flow, requiring admin to upload a photo of the received item before clicking Approve.

The photo should be stored using the existing `uploadPhoto` server action and attached to the report as documentation.

### Step 2: Add photo upload to FOUND verification

1. Import `PhotoUploadModal` and add state for `receivedPhotoUrl`
2. After the checkbox "Barang sudah diterima", add a photo upload section
3. Only enable the "Approve" button when both checkbox is checked AND photo is uploaded
4. Pass the photo URL to the verification action or store it directly on the report

### Step 3: Build and verify

Run: `npx next build`
Expected: Exit code 0

### Step 4: Commit

```bash
git add -A
git commit -m "feat: mandatory photo receipt for FOUND report admin verification"
```

---

## Post-Implementation

### Final Build Check
```bash
npx next build
```

### Update Documentation
Update `Docs/Planning/2.Flow-and-Feature.md` with changelog v2.7.
