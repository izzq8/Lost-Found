import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/utils/auth-guard";
import { getUserNavigationSnapshot } from "@/lib/queries/navigation-snapshot.query";
import UserNavClient from "@/components/layout/user-nav-client";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { Footer } from "@/components/layout/footer";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAuth();

  if (profile.role === "ADMIN") {
    redirect("/admin");
  }

  const snapshot = await getUserNavigationSnapshot(profile);

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "#F8FAFC", fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
    >
      <UserNavClient
        currentUser={snapshot.currentUser}
        unreadCount={snapshot.unreadCount}
        totalActionableBadge={snapshot.totalActionableBadge}
      />

      <main className="flex-1 pt-[64px] pb-[76px] lg:pb-0">
        <div className="max-w-[1440px] mx-auto p-4 lg:p-8">{children}</div>
      </main>

      <Footer />

      <MobileBottomNav totalActionableBadge={snapshot.totalActionableBadge} />
    </div>
  );
}
