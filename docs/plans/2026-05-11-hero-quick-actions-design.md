# Hero Section & Quick Actions Refactor

## Overview
The goal is to increase the visibility and click-through rate of primary actions ("Buat Laporan", "Tinjau Laporan", etc.) by migrating them directly into the `PageHero` section on both the User and Admin dashboards.

## Motivation
Currently, the `PageHero` component uses a vibrant orange flat gradient (`#ea580c` to `#fdba74`). The primary action buttons (like "Lapor Hilang") were placed underneath the hero section in a separate grid, making them less prominent. By moving these buttons inside the hero and styling them with high-contrast solid white backgrounds and strong shadows, we create a clear focal point.

## Proposed Changes

### 1. `PageHero` Component enhancements
- Keep the `linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fdba74 100%)`.
- Ensure the `children` container inside the hero is responsive: horizontal on desktop, wrapping or grid on mobile, so the buttons fit perfectly.

### 2. User Dashboard (`app/(main)/dashboard/page.tsx`)
- Remove the existing "Mobile Quick Actions" section below the stats.
- Pass two action buttons as `children` to `PageHero`:
  - **Lapor Hilang**: White background, red icon, dark text.
  - **Lapor Ditemukan**: White background, green icon, dark text.
- Both buttons will feature `shadow-lg`, `hover:scale-105` transitions to make them pop against the orange background.

### 3. Admin Dashboard (`app/(admin)/admin/page.tsx`)
- Add two quick action buttons as `children` to the Admin's `PageHero`:
  - **Tinjau Laporan**: Links to `/admin/reports`, white background, orange icon.
  - **Pengumuman**: Links to `/admin/announcements`, white background, blue/orange icon.

## Trade-offs
- Adding buttons inside the hero takes up more vertical space on mobile devices. We must ensure the buttons wrap elegantly or display side-by-side without overflowing the container.
