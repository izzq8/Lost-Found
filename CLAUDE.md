# CLAUDE.md — LostFound SMKFN Project Memory

> This file is the **agent memory** for AI assistants working on this codebase.  
> Read this **first** before making any changes.

---

## 📋 Project Overview

**LostFound SMKFN** — A Lost & Found reporting system for SMK Forward Nusantara.  
Students & teachers report lost/found items, admins verify reports, users claim items, and the whole lifecycle is tracked with audit logs.

| Key | Value |
|-----|-------|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Language | TypeScript (strict) |
| CSS | Tailwind CSS v4 |
| Database | PostgreSQL (Supabase) via Prisma ORM v7 |
| Auth | Supabase Auth + middleware route guard |
| Storage | Supabase Storage (public buckets) |
| Charts | Recharts v3 |
| Validation | Zod v4 |
| Forms | React Hook Form + @hookform/resolvers |
| Icons | lucide-react |
| Export | jsPDF + jspdf-autotable (PDF), xlsx/SheetJS (Excel) |

---

## 🏗️ Architecture

### Route Groups
```
app/
├── (auth)/          # Login, Register, Forgot Password (public)
│   ├── login/
│   ├── register/
│   └── forgot-password/
├── (main)/          # User dashboard (requires auth)
│   └── dashboard/
│       ├── page.tsx              # Home dashboard
│       ├── lost-items/           # Browse lost items + [id] detail
│       ├── found-items/          # Browse found items + [id] detail
│       ├── report/               # Create report (lost/found)
│       ├── claim/                # Submit claim for an item
│       ├── my-reports/           # User's own reports
│       ├── my-claims/            # User's own claims
│       ├── notifications/        # Full notifications page
│       └── profile/              # Profile & password change
├── (admin)/         # Admin panel (requires ADMIN role)
│   └── admin/
│       ├── page.tsx              # Admin dashboard (stats + charts)
│       ├── reports/              # Report moderation + [id] detail + guest mode
│       ├── claims/               # Claim processing + [id] detail + manual claim
│       ├── users/                # User management + create-admin
│       ├── password-requests/    # Password reset processing
│       ├── categories/           # Category CRUD with image upload
│       ├── enrollment/           # Enrollment code management
│       ├── announcements/        # Announcement CRUD with image + date pickers
│       ├── audit-log/            # Audit trail viewer (search, filter, paginate)
│       └── export/               # Report export (PDF + Excel)
└── api/             # API routes
    └── cron/
        └── expire-reports/      # Daily cron: expire VERIFIED reports after 30 days
```

### Key Directories
```
lib/
├── actions/         # Server Actions (all "use server" files)
│   ├── report.actions.ts         # Report CRUD + image upload
│   ├── claim.actions.ts          # Online claim submission
│   ├── comment.actions.ts        # Comments on reports/claims
│   ├── admin.actions.ts          # Admin: user mgmt, enrollment, export
│   ├── admin-claim.actions.ts    # Admin: approve/reject/complete + manual claim
│   ├── found-match.actions.ts    # User: submit "I found this lost item"
│   ├── admin-found-match.actions.ts # Admin: approve/reject/confirm/complete found match
│   ├── announcement.actions.ts   # Announcement CRUD + image upload
│   ├── user.actions.ts           # User profile updates
│   └── notification.actions.ts   # Notifications: fetch, mark-read
├── prisma/          # Prisma client singleton
├── supabase/        # Supabase clients (server SSR + admin service role)
├── validations/     # Zod schemas
│   ├── report.schema.ts
│   ├── claim.schema.ts
│   ├── comment.schema.ts
│   ├── found-match.schema.ts
│   └── announcement.schema.ts
├── utils/
│   ├── auth-guard.ts   # requireAuth(), requireAdmin()
│   ├── constants.ts    # System-wide constants (notification types, audit actions, buckets)
│   └── audit-logger.ts # Audit log helper
├── types/           # TypeScript type definitions
└── utils.ts         # cn() helper (clsx + tailwind-merge)

components/
├── shared/          # Reusable components (used across pages)
│   ├── page-hero.tsx
│   ├── item-card.tsx
│   ├── stat-card.tsx
│   ├── status-badge.tsx
│   ├── category-icon.tsx
│   └── comment-section.tsx
├── admin/           # Admin-specific layout components
├── layout/          # Shared layout components (sidebar, topbar, user-nav-client)
├── forms/           # Form components
└── ui/              # Base UI primitives
```

### Data Flow
```
User Action → Client Component → Server Action → Prisma Transaction → DB
                                      ↓
                              Auth Guard (requireAuth / requireAdmin)
                              Zod Validation
                              Magic Bytes Check (for uploads)
                              Supabase Storage Upload
                              AuditLog + Notification creation
```

---

## 🔐 Security Rules (MUST FOLLOW)

### 1. Authentication & Authorization
- **Every server action** MUST start with `requireAuth()` or `requireAdmin()`
- **Never trust client data** — always re-validate on server
- Middleware (`middleware.ts`) handles route-level protection
- Admin routes check `user_metadata.role` in middleware + `profile.role` in server actions (defense in depth)
- `requireAdmin()` calls `requireAuth()` internally — no bypass possible

### 2. Input Validation (Zod)
- **All user input** must be validated with Zod schemas before database operations
- Schemas live in `lib/validations/` — reuse them, don't inline validation
- Use `.trim()` on string inputs to prevent whitespace abuse
- File uploads: validate MIME type, file size, AND magic bytes (see below)
- **FormData.get() returns `null`** for missing fields — convert to `undefined` before Zod: `(formData.get("x") as string) || undefined`

### 3. SQL Injection Prevention
- **NEVER use raw SQL** — always use Prisma's query builder
- Prisma parameterizes all queries automatically
- If raw SQL is absolutely needed, use `prisma.$queryRaw` with tagged template literals (automatic parameterization)

### 4. XSS Prevention
- React auto-escapes JSX — **never use `dangerouslySetInnerHTML`**
- Sanitize user-generated content if rendering HTML is ever needed
- Use `encodeURIComponent()` for URL parameters
- Category names, report descriptions, etc. are rendered as text nodes only

### 5. File Upload Security
- Validate MIME type against allowlist: `image/jpeg`, `image/png`, `image/webp`
- Validate file size (reports: 5MB, categories: 2MB)
- **Validate magic bytes** — check first 4-8 bytes of file to prevent extension spoofing
- Generate random filenames (never use user-provided names directly): `${prefix}-${Date.now()}-${nanoid(6)}.${ext}`
- Upload to separate Supabase Storage buckets per content type
- **CRITICAL: Read file buffer ONCE** — Never call `file.arrayBuffer()` twice. Read to `Buffer` once, use for both validation and upload. The stream is consumed on first read.

```typescript
// Magic bytes signatures we validate:
const IMAGE_SIGNATURES = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png":  [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};
```

### 6. CSRF & Clickjacking
- Next.js Server Actions have built-in CSRF protection (origin checking)
- Security headers in `next.config.ts` (already implemented):
  ```
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: frame-ancestors 'none'
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-DNS-Prefetch-Control: on
  ```

### 7. Rate Limiting (TODO — must implement before production)
- Implement rate limiting on:
  - Login attempts (5/min per IP)
  - Report creation (3 active max per user — already enforced)
  - Claim submission (1 pending per report per user — already enforced)
  - Password reset requests (3/hour per user)
  - Comment creation (10/min per user)
- Requires Upstash Redis for serverless deployment on Vercel

### 8. Data Privacy
- **Report photos are PRIVATE** — only visible to reporter + admin
- Public users see **category icons** (uploaded by admin) instead of actual item photos
- **Comments are PUBLIC** — all authenticated users can see and write comments on any report/claim. A disclaimer warns users not to mention specific item characteristics.
- Never expose `reporter.email` in public-facing API responses
- Passwords are managed by Supabase Auth (bcrypt hashing) — never stored in our DB
- **Listing pages only show VERIFIED/AWAITING_PICKUP/CLAIMED reports** — PENDING items are NOT visible to regular users

### 9. Atomic Transactions
- **All state-changing operations** that touch multiple tables MUST use `prisma.$transaction()`
- Pattern: create/update main record + create AuditLog + create Notification — all in one transaction
- If any step fails, the entire operation rolls back

### 10. Concurrency Safety
- Use `prisma.$transaction()` for operations that read-then-write (prevents race conditions)
- Enrollment code generation: deactivate old code + create new code atomically
- Claim approval: approve one + reject all others atomically
- Report deletion: delete images from storage THEN delete DB records (idempotent)

### 11. Cron Job Security
- The `/api/cron/expire-reports` endpoint is protected by `CRON_SECRET` Bearer token
- Vercel cron configuration in `vercel.json` (daily at 01:00 UTC)
- Never expose cron endpoints without authorization checks

---

## 🧩 Coding Conventions

### File Naming
- Pages: `page.tsx` (Next.js convention)
- Client components: `kebab-case.tsx` in `_components/` folder
- Server actions: `kebab-case.actions.ts` in `lib/actions/`
- Validations: `kebab-case.schema.ts` in `lib/validations/`

### Component Pattern
```
app/(group)/route/
├── page.tsx                  # Server Component (data fetching + auth guard)
└── _components/
    └── client-component.tsx  # Client Component ("use client", interactivity)
```

- **Server components** fetch data with Prisma, apply auth guards, and serialize data
- **Client components** receive serialized data as props (no Date objects, use ISO strings)
- **Never import Prisma in client components**

### Server Action Pattern
```typescript
"use server";
export async function myAction(formData: FormData) {
  // 1. Auth guard
  const { user, profile } = await requireAuth();
  // 2. Extract & validate input
  const data = schema.parse({ ... });
  // 3. Business logic checks
  // 4. Atomic transaction (DB + audit + notification)
  await prisma.$transaction(async (tx) => { ... });
  // 5. Return result
  return { success: true };
}
```

### Navigation Pattern
- Use `router.back()` for back buttons so navigation returns to the user's actual origin
- Do NOT hardcode back link destinations (e.g., don't use `<Link href="/dashboard/lost-items">`)
- After successful form submission with `redirect()`, catch `NEXT_REDIRECT` errors **BEFORE any rollback/cleanup code**: `if (err.message === "NEXT_REDIRECT") throw err;`
  - **Bug found**: If rollback code runs before this check, it will delete successfully uploaded files from Supabase Storage

### Styling Rules
- Use Tailwind CSS utility classes
- Primary color: `orange-500` / `orange-600`
- Background: `slate-50` (light gray wash)
- Cards: `bg-white rounded-2xl border border-slate-100 shadow-sm`
- Buttons: `h-10 px-5 rounded-xl text-sm font-semibold cursor-pointer`
- Inputs: `h-11 px-4 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100`
- All interactive elements MUST have `cursor-pointer`
- Mobile-first responsive design (`sm:`, `md:`, `lg:` breakpoints)

### Error Handling
- Server actions return `{ success: boolean; error?: string }` — never throw
- Client components show errors in red alert boxes: `bg-red-50 text-red-600 rounded-xl border border-red-100`
- Use try-catch in all server actions with `console.error` for debugging
- Never expose internal error details to the client

---

## 📊 Database Schema (Key Models)

| Model | Purpose |
|-------|---------|
| `Profile` | User accounts (synced with Supabase Auth via ID) |
| `EnrollmentCode` | Registration codes (SISWA/GURU), one active per type |
| `Category` | Item categories with uploaded icon images |
| `Report` | Lost/Found reports with status lifecycle |
| `ReportImage` | Photos attached to reports (private) |
| `Claim` | Claims against reports (supports ONLINE + OFFLINE/guest) |
| `ClaimImage` | Evidence photos for claims |
| `FoundMatch` | Reports of finding a lost item (PENDING → APPROVED → ITEM_RECEIVED → COMPLETED) |
| `FoundMatchImage` | Photos attached to found match reports |
| `Comment` | Threaded discussions on reports/claims |
| `Notification` | In-app notifications |
| `Announcement` | System-wide announcements with publish/expire dates |
| `AuditLog` | Complete audit trail of all admin actions |
| `PasswordResetRequest` | Admin-processed password resets |

### Status Lifecycles
```
Report:     PENDING → VERIFIED → CLAIMED (or REJECTED / EXPIRED)
                              → AWAITING_PICKUP → CLAIMED (via FoundMatch)
Claim:      PENDING → APPROVED → COMPLETED (or REJECTED)
            Manual claims: created as APPROVED or COMPLETED directly
FoundMatch: PENDING → APPROVED → ITEM_RECEIVED → COMPLETED (or REJECTED)
```

### Claim Types
```
ONLINE:   User submits via website → admin reviews
OFFLINE:  Admin creates via /admin/claims/manual → for walk-in users or guests
```

### Claim Guest Fields
```prisma
isGuest         Boolean     @default(false)
guestName       String?     # Filled when isGuest = true
guestPhone      String?     # Filled when isGuest = true
```

---

## 🗄️ Supabase Storage Buckets

| Bucket | Purpose | Max Size | Public |
|--------|---------|----------|--------|
| `report-images` | Photos of lost/found items | 5MB | Yes |
| `claim-images` | Evidence photos for claims | 5MB | Yes |
| `found-match-images` | Photos for found match reports | 5MB | Yes |
| `category-images` | Category icons (uploaded by admin) | 2MB | Yes |
| `announcement-images` | Announcement banners | 5MB | Yes |

Setup script: `npx tsx scripts/setup-storage.ts`

---

## ✅ Implementation Status

### Fase 1-4: Foundation (DONE)
- [x] Project scaffolding, Prisma schema, Supabase integration
- [x] Auth flow (login, register with enrollment code, forgot password)
- [x] Middleware route protection
- [x] Database seeding

### Fase 5: User Dashboard (DONE)
- [x] Dashboard with stats & recent items (only shows VERIFIED/CLAIMED)
- [x] Lost/Found item listing + detail pages (only shows VERIFIED/CLAIMED)
- [x] Report creation (lost/found) with image upload
- [x] Claim submission with evidence
- [x] My Reports & My Claims tracking
- [x] Comment system (on reports & claims)
- [x] Photo privacy (category icon for public, real photo for owner/admin)
- [x] Profile page
- [x] Notifications full page (`/dashboard/notifications`) with grouped display

### Fase 6: Admin Panel (DONE)
- [x] Admin dashboard with Recharts (bar chart + donut chart)
- [x] Report moderation (verify/reject) + guest report mode
- [x] Claim processing (approve/reject/complete)
- [x] Manual claim for guests/walk-ins (`/admin/claims/manual`)
- [x] User management (activate/deactivate)
- [x] Create admin account (Supabase Auth + DB)
- [x] Password reset processing (auto-generate + copy)
- [x] Category CRUD with image upload (drag & drop + Supabase Storage)
- [x] Enrollment code management (generate/deactivate per type)

### Fase 7: Remaining Features (DONE)
- [x] Announcements CRUD (`/admin/announcements`) — image upload + publish/expire dates
- [x] Audit Trail viewer (`/admin/audit-log`) — search, filter, paginate, color-coded
- [x] Report export to PDF/Excel (`/admin/export`) — filter by date/type/status
- [x] Notification system — bell dropdown fetches real data + full `/dashboard/notifications` page
- [x] Report expiration cron job (`/api/cron/expire-reports`) — 30-day auto-expire + 5-day warning
- [x] Security headers in `next.config.ts` (7 headers including CSP, Permissions-Policy)
- [x] `vercel.json` cron configuration

### Known Issues Fixed (Session 2)
- [x] Report form back button was hardcoded → changed to `router.back()` for dynamic navigation
- [x] Comment posting always failed → `FormData.get()` returns `null`, Zod `.uuid()` rejected it → converted `null` to `undefined`
- [x] Unverified items (PENDING) were visible to users → changed query to `status: { in: ["VERIFIED", "CLAIMED"] }`
- [x] Manual claim page was missing → created full implementation with guest support

### Remaining (Deferred)
- [ ] Found Match feature (`FoundMatch` model + admin UI + user button) — see `Docs/Implementation-Plan/Found Match.md`
- [ ] Guest Report by admin (admin creates report on behalf of guest without account)
- [ ] Rate limiting (needs Upstash Redis for Vercel serverless)
- [ ] E2E testing with Playwright (separate phase)
- [ ] CAPTCHA on registration (optional enhancement)
- [ ] SMTP/email notifications (currently all in-app only)

---

## 🛡️ Security Checklist (Pre-Production)

- [x] Add security headers (X-Frame-Options, CSP, HSTS, Permissions-Policy)
- [ ] Implement rate limiting on auth endpoints
- [ ] Implement rate limiting on report/claim creation
- [ ] Add CAPTCHA on registration (optional)
- [x] Audit all server actions for proper auth guards
- [ ] Review Supabase RLS policies
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in server-only env (never expose to client)
- [ ] Enable Supabase Auth email confirmation for production
- [ ] Set up proper CORS headers
- [ ] Run `npm audit` and fix vulnerabilities
- [x] Test with different roles (USER, ADMIN) to verify access control
- [x] Verify photo privacy (non-owner cannot see report images)
- [x] Cron job endpoint protected with CRON_SECRET Bearer token

---

## 🔧 Development Commands

```bash
# Dev server
npm run dev

# TypeScript check
npx tsc --noEmit

# Database
npx prisma generate        # Generate client
npx prisma migrate dev     # Create migration
npx prisma db push         # Push schema (no migration)
npx prisma db seed         # Seed database
npx prisma studio          # Visual DB browser

# Storage setup
npx tsx scripts/setup-storage.ts

# Build
npm run build
```

### Seed Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@smkforwardnusantara.sch.id` | `Admin@2026!` |
| Demo Siswa | `siswa.demo@smkforwardnusantara.sch.id` | `Password123!` |

### Enrollment Codes (from seed)
| Type | Code |
|------|------|
| Siswa | `FWD-SISWA-2026` |
| Guru | `FWD-GURU-2026` |

---

## 📖 Reference Docs

- Planning: `Docs/Planning/2.Flow-and-Feature.md`
- Tech Spec: `Docs/Planning/4-Tech-Spec.md`
- Mockups: `Docs/Planning/3-Mockup.md`
- Figma mockups: `mockup/` directory
- Implementation plans: `Docs/Implementation-Plan/`
  - Found Match: `Docs/Implementation-Plan/Found Match.md`
