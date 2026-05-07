# AGENTS.md — AI Agent Guidelines

> Rules and conventions for AI agents working on this codebase.  
> Read `CLAUDE.md` first for project architecture and status.

---

## ⚡ Quick Reference

```
Tech:    Next.js 16 · React 19 · TypeScript · Tailwind v4 · Prisma 7 · Supabase · Zod 4
DB:      PostgreSQL (Supabase) — NEVER raw SQL, always Prisma
Auth:    Supabase Auth + middleware + server action guards
Storage: Supabase Storage (category-images, report-images, claim-images, announcement-images, found-match-images)
Styling: Orange primary (#EA580C) · Rounded-2xl cards · Mobile-first
Export:  jsPDF + jspdf-autotable (PDF), xlsx/SheetJS (Excel) — client-side generation
Cron:    /api/cron/expire-reports — daily at 01:00 UTC (vercel.json)
```

---

## 🚨 Critical Rules

### NEVER Do
1. **Never use `dangerouslySetInnerHTML`** — XSS risk
2. **Never use raw SQL** — always Prisma query builder
3. **Never expose `SUPABASE_SERVICE_ROLE_KEY`** to client components
4. **Never skip auth guards** in server actions — always `requireAuth()` or `requireAdmin()` first
5. **Never trust file extensions** — validate magic bytes for uploads
6. **Never pass Date objects** to client components — serialize to ISO strings
7. **Never import `prisma`** in client components (they run in the browser)
8. **Never store passwords** in our database — Supabase Auth handles this
9. **Never show report photos** to users who aren't the reporter or admin
10. **Never skip `prisma.$transaction()`** when modifying multiple tables
11. **Never hardcode back button destinations** — use `router.back()` for dynamic navigation
12. **Never show PENDING reports** in user-facing listings — only VERIFIED/CLAIMED are public
13. **Never forget** the public comment disclaimer warning in comment sections

### ALWAYS Do
1. **Always validate** user input with Zod before DB operations
2. **Always use** `prisma.$transaction()` for multi-table mutations
3. **Always create** `AuditLog` entries for admin actions
4. **Always create** `Notification` entries when status changes affect users
5. **Always use** `cursor-pointer` class on clickable elements
6. **Always handle** loading states with `Loader2` spinner from lucide-react
7. **Always return** `{ success: boolean; error?: string }` from server actions
8. **Always trim** string inputs before validation/storage
9. **Always check** TypeScript with `npx tsc --noEmit` after changes
10. **Always use** the established component pattern: Server page → Client component
11. **Always convert** `FormData.get()` null values to `undefined` for Zod optional fields: `(formData.get("x") as string) || undefined`
12. **Always filter** user-facing report queries with `status: { in: ["VERIFIED", "AWAITING_PICKUP", "CLAIMED"] }`

---

## 🐛 Known Gotchas & Lessons Learned

### FormData + Zod Optional Fields
`FormData.get("field")` returns `null` when the field is absent, but Zod `.optional()` expects `undefined`. Casting `null as string` passes a truthy check but fails `.uuid()` validation. **Fix:** Always use `(formData.get("x") as string) || undefined`.

### Next.js Redirect in Server Actions
`redirect()` throws an error with message `"NEXT_REDIRECT"`. If your server action has a try-catch, you MUST re-throw this **BEFORE any rollback logic**: `if (err.message === "NEXT_REDIRECT") throw err;` — otherwise rollback code will delete successfully uploaded files.

### Server Actions in Network Tab
Server Actions appear as `fetch` requests in the browser Network tab, not as POST requests to a named endpoint. This is expected Next.js behavior — the response body contains the serialized return value.

### Report Visibility Rules
- **User-facing listings** (dashboard, lost-items, found-items): Only show `VERIFIED` and `CLAIMED`
- **My Reports** page: Show ALL statuses (user can see their own PENDING/REJECTED)
- **Admin reports page**: Show ALL statuses (admin sees everything)

### Comment Visibility Rules
- **Comments are PUBLIC** — all authenticated users can see and write comments on any report/claim
- A disclaimer warning is shown: "Don't mention specific item characteristics to prevent false claims"
- Users can delete their own comments, admins can delete any comment

### Manual Claim (Offline/Guest)
For walk-in guests without accounts, the claim's `claimantId` is set to the admin's ID, with `isGuest: true`, `guestName`, and `guestPhone` filled. The claim type is `OFFLINE`.

### File Upload Buffer Pattern
**CRITICAL**: Never call `file.arrayBuffer()` twice on the same File object. Read the file to a `Buffer` **once**, then use that buffer for both magic bytes validation and Supabase upload. The stream is consumed on first read.

### Found Match
Found Match is a separate model from Claim — it handles the flow where someone finds a lost item (report type LOST). The flow is: submit → admin approve → finder hands over item → admin confirms → owner picks up. Status progression: PENDING → APPROVED → ITEM_RECEIVED → COMPLETED. Report status changes: VERIFIED → AWAITING_PICKUP → CLAIMED.

---

## 📐 Patterns to Follow

### New Admin Page Pattern
```
app/(admin)/admin/{feature}/
├── page.tsx                          # Server: requireAdmin() + fetch data
└── _components/
    └── {feature}-client.tsx          # Client: interactivity + modals
```

### New User Page Pattern
```
app/(main)/dashboard/{feature}/
├── page.tsx                          # Server: requireAuth() + fetch data
└── _components/
    └── {feature}-client.tsx          # Client: interactivity
```

### New Server Action Pattern
```typescript
"use server";
import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import { mySchema } from "@/lib/validations/my.schema";

export async function myAction(formData: FormData) {
  try {
    const { user, profile } = await requireAuth();
    
    // Validate — convert null to undefined for optional fields!
    const parsed = mySchema.parse({
      required: formData.get("required") as string,
      optional: (formData.get("optional") as string) || undefined,
    });
    
    // Business checks
    ...
    
    // Atomic mutation
    await prisma.$transaction(async (tx) => {
      // Main operation
      await tx.myModel.create({ data: {...} });
      // Audit
      await tx.auditLog.create({ data: { action: "...", actorId: user.id, ... } });
      // Notification (if needed)
      await tx.notification.create({ data: {...} });
    });
    
    return { success: true };
  } catch (err: any) {
    if (err.message === "NEXT_REDIRECT") throw err; // Don't catch redirects!
    console.error("myAction error:", err);
    return { success: false, error: "User-friendly message" };
  }
}
```

### File Upload Pattern
```typescript
// 1. Validate MIME type against allowlist
if (!ALLOWED_TYPES.includes(file.type)) return error;

// 2. Validate file size
if (file.size > MAX_SIZE) return error;

// 3. Validate magic bytes (anti-spoofing)
const isValid = await validateImageMagicBytes(file, file.type);
if (!isValid) return error;

// 4. Generate safe filename
const fileName = `${prefix}-${Date.now()}-${randomId()}.${ext}`;

// 5. Upload to Supabase Storage
const { data, error } = await supabaseAdmin.storage
  .from(bucketName)
  .upload(fileName, file, { contentType: file.type });

// 6. Get public URL
const { data: { publicUrl } } = supabaseAdmin.storage
  .from(bucketName)
  .getPublicUrl(data.path);
```

### Serialization Pattern (Server → Client)
```typescript
// Server page.tsx:
const items = await prisma.model.findMany({ ... });
const serialized = items.map(item => ({
  ...item,
  createdAt: item.createdAt.toISOString(),  // Date → string
  updatedAt: item.updatedAt.toISOString(),
}));
return <ClientComponent items={serialized} />;
```

---

## 🎨 UI Conventions

### Color Palette
| Usage | Color | Tailwind |
|-------|-------|----------|
| Primary | `#EA580C` | `orange-600` |
| Primary hover | `#C2410C` | `orange-700` |
| Primary button | `#F97316` | `orange-500` |
| Background | `#F8FAFC` | `slate-50` |
| Card | `#FFFFFF` | `white` |
| Text primary | `#1E293B` | `slate-800` |
| Text secondary | `#64748B` | `slate-500` |
| Text muted | `#94A3B8` | `slate-400` |
| Border | `#F1F5F9` | `slate-100` |
| Error | `#DC2626` | `red-600` |
| Success | `#16A34A` | `green-600` |

### Component Sizing
```
Card:     rounded-2xl, border border-slate-100, shadow-sm
Button:   h-10, px-5, rounded-xl, text-sm, font-semibold
Input:    h-11, px-4, rounded-xl, border border-slate-200
Badge:    px-2.5, py-0.5, rounded-full, text-[11px], font-bold
Modal:    max-w-md or max-w-lg, rounded-2xl, shadow-2xl
Table:    rounded-2xl overflow-hidden, hover:bg-orange-50/30
```

### Responsive
- Mobile first: default styles → `sm:` → `md:` → `lg:`
- Sidebar collapses on mobile
- Tables → card layout on mobile (`sm:hidden` / `hidden sm:block` or `md:hidden` / `hidden md:block`)
- Modal: full-width on mobile, max-w-md on desktop
- Filter bars: stack vertically on mobile (`flex-col sm:flex-row`)

---

## 📝 Commit Message Convention

```
feat: add category image upload
fix: broken image fallback in category table
refactor: extract file upload helper
security: add magic bytes validation for uploads
style: responsive mobile cards for categories
docs: update CLAUDE.md with implementation status
```

---

## 🧪 Testing Checklist

Before marking any feature as done:
1. `npx tsc --noEmit` — 0 errors
2. Manual test on desktop browser
3. Manual test on mobile viewport (375px)
4. Test with ADMIN role
5. Test with USER role
6. Test error cases (invalid input, unauthorized access)
7. Check Prisma logs for N+1 queries
8. Verify all server actions have auth guards

---

## 📚 Key Files to Know

| File | Purpose |
|------|---------|
| `middleware.ts` | Route protection (auth + admin checks) |
| `lib/utils/auth-guard.ts` | Server-side auth guards (`requireAuth`, `requireAdmin`) |
| `lib/supabase/admin.ts` | Service role client (NEVER expose to client) |
| `lib/supabase/server.ts` | SSR Supabase client (per-request) |
| `lib/utils/constants.ts` | All system constants (bucket names, audit actions, notification types) |
| `prisma/schema.prisma` | Database schema (source of truth) |
| `prisma/seed.ts` | Database seeding script |
| `scripts/setup-storage.ts` | Supabase Storage bucket creation |
| `components/shared/` | Reusable UI components |
| `next.config.ts` | Security headers + Server Action config |
| `vercel.json` | Cron job schedule for report expiration |
| `app/api/cron/expire-reports/route.ts` | Cron: expire VERIFIED reports > 30 days |
| `lib/actions/admin-claim.actions.ts` | Approve/reject/complete + manual claim for guests |
| `lib/actions/found-match.actions.ts` | User submits "I found this lost item" |
| `lib/actions/admin-found-match.actions.ts` | Admin: approve/reject/confirm-received/complete found match |
| `lib/actions/announcement.actions.ts` | Announcement CRUD with image upload |

---

## 📦 Complete Feature Map

| Feature | Route | Status |
|---------|-------|--------|
| Login | `/login` | ✅ |
| Register | `/register` | ✅ |
| Forgot Password | `/forgot-password` | ✅ |
| User Dashboard | `/dashboard` | ✅ |
| Lost Items Listing | `/dashboard/lost-items` | ✅ |
| Found Items Listing | `/dashboard/found-items` | ✅ |
| Item Detail | `/dashboard/lost-items/[id]` or `/dashboard/found-items/[id]` | ✅ |
| Report Lost | `/dashboard/report/lost` | ✅ |
| Report Found | `/dashboard/report/found` | ✅ |
| Submit Claim | `/dashboard/claim/[itemId]` | ✅ |
| My Reports | `/dashboard/my-reports` | ✅ |
| My Claims | `/dashboard/my-claims` | ✅ |
| Profile | `/dashboard/profile` | ✅ |
| Notifications | `/dashboard/notifications` | ✅ |
| Admin Dashboard | `/admin` | ✅ |
| Admin Reports | `/admin/reports` + `/admin/reports/[id]` | ✅ |
| Guest Report | `/admin/reports/guest` | ✅ |
| Admin Claims | `/admin/claims` + `/admin/claims/[id]` | ✅ |
| Manual Claim | `/admin/claims/manual` | ✅ |
| User Management | `/admin/users` | ✅ |
| Create Admin | `/admin/users/create-admin` | ✅ |
| Password Requests | `/admin/password-requests` | ✅ |
| Categories | `/admin/categories` | ✅ |
| Enrollment Codes | `/admin/enrollment` | ✅ |
| Announcements | `/admin/announcements` | ✅ |
| Audit Log | `/admin/audit-log` | ✅ |
| Export Reports | `/admin/export` | ✅ |
| Found Matches | `/admin/found-matches` + `/admin/found-matches/[id]` | 🔲 |
| Cron: Expire Reports | `/api/cron/expire-reports` | ✅ |
