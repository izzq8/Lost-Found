import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/utils/auth-guard";
import { prisma } from "@/lib/prisma/client";
import UserNavClient from "@/components/layout/user-nav-client";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAuth();

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  if (!profile || profile.status === "DEACTIVATED") {
    redirect("/login");
  }

  if (profile.role === "ADMIN") {
    // Prevent admins from accessing the user dashboard if they meant to go to admin
    // redirect("/admin/dashboard");
  }

  // Fetch unread notifications count (for Phase 3, we just count them if schema allows, or return 0 for now)
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false }
  });

  // Count reports with actionable found-matches (item found, needs pickup)
  const actionableReportsCount = await prisma.report.count({
    where: {
      reporterId: user.id,
      type: "LOST",
      status: { in: ["VERIFIED", "AWAITING_PICKUP"] },
      foundMatches: { some: { status: { in: ["APPROVED", "ITEM_RECEIVED"] } } },
    },
  });

  // Prepare safe serializable user object for client
  const clientUser = {
    id: profile.id,
    name: profile.name,
    jabatan: profile.jabatan.toLowerCase().replace(/_/g, " "),
    avatarInitials: profile.name.substring(0, 2).toUpperCase(),
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#F8FAFC', fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
      <UserNavClient currentUser={clientUser} unreadCount={unreadCount} actionableReportsCount={actionableReportsCount} />
      
      {/* Content */}
      <main className="flex-1 pt-[64px] pb-[76px] lg:pb-0">
        <div className="max-w-[1440px] mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>

      {/* Footer minimalis */}
      <footer className="py-6 border-t border-slate-200 mt-auto bg-white/50 backdrop-blur-sm">
        <div className="text-center text-slate-500 text-sm">
           © 2026 SMK Forward Nusantara. All rights reserved.
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
