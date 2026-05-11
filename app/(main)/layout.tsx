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
    redirect("/admin");
  }

  // Parallel data fetching — all counts are independent
  const [unreadCount, actionableReportsCount, actionableClaimsCount, pendingFoundReportsCount] = await Promise.all([
    prisma.notification.count({
      where: { userId: user.id, isRead: false }
    }),
    prisma.report.count({
      where: {
        reporterId: user.id,
        type: "LOST",
        status: { in: ["VERIFIED", "AWAITING_PICKUP"] },
        foundMatches: { some: { status: { in: ["APPROVED", "ITEM_RECEIVED"] } } },
      },
    }),
    prisma.claim.count({
      where: {
        claimantId: user.id,
        status: "APPROVED",
      },
    }),
    prisma.report.count({
      where: {
        reporterId: user.id,
        type: "FOUND",
        status: "PENDING",
      },
    }),
  ]);

  const totalActionableBadge = actionableReportsCount + actionableClaimsCount + pendingFoundReportsCount;

  // Prepare safe serializable user object for client
  const clientUser = {
    id: profile.id,
    name: profile.name,
    jabatan: profile.jabatan.toLowerCase().replace(/_/g, " "),
    avatarInitials: profile.name.substring(0, 2).toUpperCase(),
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#F8FAFC', fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
      <UserNavClient 
        currentUser={clientUser} 
        unreadCount={unreadCount} 
        totalActionableBadge={totalActionableBadge}
      />
      
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
      <MobileBottomNav totalActionableBadge={totalActionableBadge} />
    </div>
  );
}
