"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, FileText, ClipboardList, Users, Tag, KeyRound,
  Megaphone, Activity, Download, UserPlus, Menu, X, ChevronLeft,
  ChevronRight, Bell, LogOut, User, Search, ChevronDown, SearchCheck
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { markAllNotificationsAsRead, getRecentNotifications } from "@/lib/actions/notification.actions";
import { getNotificationHref } from "@/lib/utils/notification-href";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

type AdminMenuItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  badge: number;
};

type AdminMenuGroup = {
  label: string;
  items: AdminMenuItem[];
};

// ── SIDEBAR MENU DEFINITION ──────────────────────────────────────────────────
const getMenuGroups = (badges: { reports: number; claims: number; foundMatch: number }): AdminMenuGroup[] => [
  {
    label: "Utama",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/admin", badge: 0 },
    ],
  },
  {
    label: "Pelaporan",
    items: [
      { icon: FileText, label: "Semua Laporan", href: "/admin/reports", badge: badges.reports },
    ],
  },
  {
    label: "Klaim & Penemuan",
    items: [
      { icon: ClipboardList, label: "Semua Klaim", href: "/admin/claims", badge: badges.claims },
      { icon: SearchCheck, label: "Found Match", href: "/admin/found-matches", badge: badges.foundMatch },
    ],
  },
  {
    label: "Pengguna",
    items: [
      { icon: Users, label: "Manajemen User", href: "/admin/users", badge: 0 },
    ],
  },
  {
    label: "Sistem",
    items: [
      { icon: Tag, label: "Kategori", href: "/admin/categories", badge: 0 },
      { icon: KeyRound, label: "Enrollment Code", href: "/admin/enrollment", badge: 0 },
      // Fitur Pengumuman di-disable sementara (Deferred) untuk saran pengembangan
    ],
  },
  {
    label: "Laporan & Log",
    items: [
      { icon: Download, label: "Export Laporan", href: "/admin/export", badge: 0 },
      { icon: Activity, label: "Audit Trail", href: "/admin/audit-log", badge: 0 },
    ],
  },
];

interface AdminLayoutClientProps {
  children: React.ReactNode;
  currentUser: {
    id: string;
    name: string;
    jabatan: string;
    avatarInitials: string;
  };
  unreadCount: number;
  pendingReportsCount: number;
  pendingClaimsCount: number;
  pendingFoundMatchCount: number;
}

function SidebarContent({
  isMobile = false,
  collapsed,
  menuGroups,
  isActive,
  onNavigate,
  onToggleCollapsed,
}: {
  isMobile?: boolean;
  collapsed: boolean;
  menuGroups: AdminMenuGroup[];
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
  onToggleCollapsed: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 h-16 shrink-0 border-b border-slate-100">
        <Image src="/logo.png" alt="LostFound SMKFN Logo" width={36} height={36} className="shrink-0" />
        {(!collapsed || isMobile) && (
          <span className="text-[15px] font-bold text-slate-800 whitespace-nowrap">
            LostFound <span className="text-orange-500">SMKFN</span>
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {menuGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {(!collapsed || isMobile) && (
              <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed && !isMobile ? item.label : undefined}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all group relative ${
                    active
                      ? "bg-orange-50 text-orange-600 font-semibold shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                  style={{ fontSize: "13px" }}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-orange-500 rounded-r-full" />
                  )}
                  <Icon size={18} className={`shrink-0 ${active ? "text-orange-500" : "text-slate-400 group-hover:text-slate-600"}`} />
                  {(!collapsed || isMobile) && (
                    <span className="flex-1 flex items-center justify-between">
                      <span>{item.label}</span>
                      {item.badge > 0 && (
                        <span className="ml-auto w-5 h-5 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {!isMobile && (
        <button
          onClick={onToggleCollapsed}
          className="mx-3 mb-4 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      )}
    </div>
  );
}

export default function AdminLayoutClient({ children, currentUser, unreadCount, pendingReportsCount, pendingClaimsCount, pendingFoundMatchCount }: AdminLayoutClientProps) {
  const menuGroups = getMenuGroups({ reports: pendingReportsCount, claims: pendingClaimsCount, foundMatch: pendingFoundMatchCount });
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifItems, setNotifItems] = useState<{ id: string; type: string; message: string; data: Record<string, string> | null; isRead: boolean; createdAt: string }[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [nowMs] = useState(() => Date.now());
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── REALTIME SUBSCRIPTIONS ──────────────────────────────────────────────
  useRealtimeRefresh({
    tables: [{ table: "notifications", event: "INSERT", filter: `user_id=eq.${currentUser.id}` }],
    onEvent: () => router.refresh(),
    debounceMs: 1500,
  });

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleNotifClick = async () => {
    const next = !showNotif;
    setShowNotif(next);
    if (next) {
      setNotifLoading(true);
      const items = await getRecentNotifications(8);
      setNotifItems(items);
      setNotifLoading(false);
      if (unreadCount > 0) {
        await markAllNotificationsAsRead(pathname);
      }
    }
  };

  const timeAgo = (iso: string) => {
    const diff = nowMs - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari lalu`;
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex min-h-screen" style={{ background: "#F8FAFC", fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
      {/* ── DESKTOP SIDEBAR ─────────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 bg-white border-r border-slate-100 z-40 transition-all duration-300"
        style={{ width: collapsed ? 72 : 260 }}
      >
        <SidebarContent
          collapsed={collapsed}
          menuGroups={menuGroups}
          isActive={isActive}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
        />
      </aside>

      {/* ── MOBILE SIDEBAR OVERLAY ──────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100 shrink-0">
              <span className="text-[15px] font-bold text-slate-800">Menu Admin</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent
                isMobile
                collapsed={collapsed}
                menuGroups={menuGroups}
                isActive={isActive}
                onNavigate={() => setMobileOpen(false)}
                onToggleCollapsed={() => setCollapsed((value) => !value)}
              />
            </div>
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ───────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-4 lg:px-6">
          {/* Left: Hamburger + Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <Menu size={20} className="text-slate-600" />
            </button>
            <div className="text-sm text-slate-500 font-medium truncate max-w-[180px] sm:max-w-none">
              <span className="text-slate-800 font-semibold">Admin</span>
              {pathname !== "/admin" && (
                <span className="hidden sm:inline"> / {pathname.split("/").filter(Boolean).slice(1).join(" / ")}</span>
              )}
            </div>
          </div>

          {/* Right: Notif + User */}
          <div className="flex items-center gap-2">
            {/* Notification */}
            <div className="relative" ref={notifRef}>
              <button onClick={handleNotifClick} className="relative p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <Bell size={20} className="text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotif && (
                <div
                  className="lg:hidden fixed inset-0 bg-black/20 z-[79]"
                  onClick={() => setShowNotif(false)}
                />
              )}
              {showNotif && (
                <div className="fixed lg:absolute top-16 lg:top-full lg:mt-1.5 left-0 right-0 lg:left-auto lg:right-0 lg:w-[320px] mx-2 lg:mx-0 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xl z-[80]">
                  <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-800">Notifikasi</div>
                  {notifLoading ? (
                    <div className="p-6 text-center">
                      <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : notifItems.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-400">Belum ada notifikasi</div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                      {notifItems.map((n) => {
                        const href = getNotificationHref(n.type, n.data, 'ADMIN');
                        const content = (
                          <>
                            <p className="text-xs text-slate-700 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                          </>
                        );
                        return href ? (
                          <Link
                            key={n.id}
                            href={href}
                            onClick={() => setShowNotif(false)}
                            className={`block px-4 py-3 border-b border-slate-50 last:border-b-0 hover:bg-orange-50/50 transition-colors ${!n.isRead ? 'bg-orange-50/40' : ''}`}
                          >
                            {content}
                          </Link>
                        ) : (
                          <div key={n.id} className={`px-4 py-3 border-b border-slate-50 last:border-b-0 ${!n.isRead ? 'bg-orange-50/40' : ''}`}>
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-orange-100 text-orange-700 text-xs font-bold">
                  {currentUser.avatarInitials}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-[13px] font-semibold text-slate-800 leading-tight">{currentUser.name}</p>
                  <p className="text-[11px] text-orange-500 leading-tight capitalize">{currentUser.jabatan}</p>
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden md:block" />
              </button>
              {showUserMenu && (
                <div className="absolute top-full mt-1.5 right-0 w-[200px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xl py-1">
                  <Link href="/admin/profile" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-slate-600 hover:bg-slate-50 text-[13px] font-medium">
                    <User size={16} /> Profil
                  </Link>
                  <div className="border-t border-slate-100 my-1" />
                  <button onClick={() => { setShowUserMenu(false); handleLogout(); }} className="flex items-center w-full gap-2.5 px-4 py-2.5 text-red-500 hover:bg-red-50 text-[13px] font-medium text-left">
                    <LogOut size={16} /> Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 lg:p-6 xl:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
