"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Bell, Search, User, LogOut, FileText, ClipboardList, Menu, X,
  LayoutDashboard, Package, Eye, PenLine, Shield, ChevronDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { markAllNotificationsAsRead, getRecentNotifications } from '@/lib/actions/notification.actions';
import { getNotificationHref } from '@/lib/utils/notification-href';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Package, label: 'Barang Hilang', href: '/dashboard/lost-items' },
  { icon: Eye, label: 'Barang Ditemukan', href: '/dashboard/found-items' },
];

const laporItems = [
  { icon: PenLine, label: 'Lapor Barang Hilang', href: '/dashboard/report/lost' },
  { icon: PenLine, label: 'Lapor Barang Ditemukan', href: '/dashboard/report/found' },
];

const riwayatItems = [
  { icon: FileText, label: 'Riwayat Laporan', href: '/dashboard/my-reports' },
  { icon: ClipboardList, label: 'Riwayat Klaim', href: '/dashboard/my-claims' },
];

interface UserNavClientProps {
  currentUser: {
    id: string;
    name: string;
    jabatan: string;
    avatarInitials: string;
  };
  unreadCount?: number;
  actionableReportsCount?: number;
  actionableClaimsCount?: number;
}

export default function UserNavClient({ currentUser, unreadCount = 0, actionableReportsCount = 0, actionableClaimsCount = 0 }: UserNavClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const supabase = createClient();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); setOpenDropdown(null); }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    // Lapor items: match exact path or subpath but NOT other lapor routes
    return pathname === href || pathname.startsWith(href + '/');
  };

  const isGroupActive = (items: { href: string }[]) => items.some(i => {
    if (i.href === '/dashboard') return pathname === '/dashboard';
    return pathname === i.href || pathname.startsWith(i.href + '/');
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const [notifItems, setNotifItems] = useState<{ id: string; type: string; message: string; data: Record<string, string> | null; isRead: boolean; createdAt: string }[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

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
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari lalu`;
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          active
            ? 'bg-orange-500/15 text-orange-600'
            : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
        }`}
        style={{ fontSize: '14px', fontWeight: active ? 600 : 500 }}
      >
        <Icon size={18} className="shrink-0" />
        <span>{label}</span>
      </Link>
    );
  };

  const DropdownMenu = ({ id, label, items, badge }: { id: string; label: string; items: { icon: any; label: string; href: string; badge?: number }[]; badge?: number }) => {
    const active = isGroupActive(items);
    const isOpen = openDropdown === id;
    return (
      <div className="relative" ref={isOpen ? dropdownRef : undefined}>
        <button
          onClick={() => setOpenDropdown(isOpen ? null : id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
            active
              ? 'bg-orange-500/15 text-orange-600'
              : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
          }`}
          style={{ fontSize: '14px', fontWeight: active ? 600 : 500 }}
        >
          <span>{label}</span>
          {badge && badge > 0 ? (
            <span className="ml-1 w-[18px] h-[18px] bg-green-500 text-white rounded-full flex items-center justify-center" style={{ fontSize: '10px', fontWeight: 700 }}>
              {badge}
            </span>
          ) : null}
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div
            className="absolute top-full mt-1.5 left-0 min-w-[220px] bg-white/90 backdrop-blur-xl rounded-xl border border-white/50 overflow-hidden py-1"
            style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }}
          >
            {items.map(item => {
              const itemActive = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpenDropdown(null)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors ${
                    itemActive ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  style={{ fontSize: '13px', fontWeight: itemActive ? 600 : 500 }}
                >
                  <item.icon size={16} className="shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="ml-auto w-[18px] h-[18px] bg-green-500 text-white rounded-full flex items-center justify-center" style={{ fontSize: '10px', fontWeight: 700 }}>
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          height: '64px',
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div className="h-full max-w-[1440px] mx-auto flex items-center justify-between px-4 lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
              <Search size={18} className="text-white" />
            </div>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' }}>
              LostFound <span className="text-orange-500">SMKFN</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />)}
            <DropdownMenu id="lapor" label="Lapor" items={laporItems} />
            <DropdownMenu id="riwayat" label="Riwayat" items={[
              { icon: FileText, label: 'Riwayat Laporan', href: '/dashboard/my-reports', badge: actionableReportsCount },
              { icon: ClipboardList, label: 'Riwayat Klaim', href: '/dashboard/my-claims', badge: actionableClaimsCount },
            ]} badge={(actionableReportsCount + actionableClaimsCount) || 0} />
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleNotifClick}
                className="relative p-2 rounded-lg hover:bg-white/60 cursor-pointer transition-colors"
                title="Notifikasi"
              >
                <Bell size={20} className="text-slate-600" />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red-500 text-white rounded-full flex items-center justify-center"
                    style={{ fontSize: '10px', fontWeight: 700 }}
                  >
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
                <div
                  className="fixed lg:absolute top-[64px] lg:top-full lg:mt-1.5 left-0 right-0 lg:left-auto lg:right-0 lg:w-[320px] mx-2 lg:mx-0 bg-white/95 backdrop-blur-xl rounded-xl border border-white/50 overflow-hidden z-[80]"
                  style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>Notifikasi</span>
                    <Link href="/dashboard/notifications" className="text-xs text-orange-600 font-medium hover:underline" onClick={() => setShowNotif(false)}>Lihat semua</Link>
                  </div>
                  {notifLoading ? (
                    <div className="p-6 text-center">
                      <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : notifItems.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">Belum ada notifikasi</div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                      {notifItems.map((n) => {
                        const href = getNotificationHref(n.type, n.data, 'USER');
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

            <div className="relative hidden lg:block" ref={userRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/60 cursor-pointer transition-colors border border-transparent hover:border-slate-200"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: '#FFEDD5', color: '#C2410C', fontSize: '12px', fontWeight: 700 }}
                >
                  {currentUser.avatarInitials}
                </div>
                <div className="hidden xl:block text-left">
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', lineHeight: 1.2 }}>{currentUser.name}</p>
                  <p style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.2, textTransform: 'capitalize' }}>{currentUser.jabatan}</p>
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden xl:block" />
              </button>
              {showUserMenu && (
                <div
                  className="absolute top-full mt-1.5 right-0 w-[200px] bg-white/95 backdrop-blur-xl rounded-xl border border-white/50 overflow-hidden py-1"
                  style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }}
                >
                  <div className="px-4 py-3 border-b border-slate-100 xl:hidden">
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{currentUser.name}</p>
                      <p style={{ fontSize: '11px', color: '#F97316' }}>{currentUser.jabatan}</p>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    style={{ fontSize: '13px', fontWeight: 500 }}
                  >
                    <User size={16} /> Profil
                  </Link>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => { setShowUserMenu(false); handleLogout(); }}
                    className="flex items-center w-full gap-2.5 px-4 py-2.5 text-red-500 hover:bg-red-50 transition-colors text-left"
                    style={{ fontSize: '13px', fontWeight: 500 }}
                  >
                    <LogOut size={16} /> Keluar
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/60 cursor-pointer transition-colors"
            >
              <Menu size={20} className="text-slate-700" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setMobileOpen(false)} />
          <aside
            className="absolute right-0 top-0 bottom-0 w-[300px] bg-white/95 backdrop-blur-xl overflow-y-auto"
            style={{ boxShadow: '-8px 0 32px rgba(0,0,0,0.1)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="mx-4 mt-4 mb-3 p-3 rounded-xl" style={{ background: '#FFF7ED' }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: '#FED7AA', color: '#C2410C', fontSize: '13px', fontWeight: 700 }}
                >
                  {currentUser.avatarInitials}
                </div>
                <div className="min-w-0">
                  <p className="truncate" style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{currentUser.name}</p>
                  <p className="truncate" style={{ fontSize: '12px', color: '#F97316', textTransform: 'capitalize' }}>{currentUser.jabatan}</p>
                </div>
              </div>
            </div>

            <div className="px-4 py-2">
              <p className="px-2 mb-2" style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Akun
              </p>
              <Link
                href="/dashboard/profile"
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/dashboard/profile')
                    ? 'bg-orange-500/15 text-orange-600'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
                style={{ fontSize: '14px', fontWeight: isActive('/dashboard/profile') ? 600 : 500 }}
              >
                <User size={18} className="shrink-0" />
                <span>Profil Saya</span>
              </Link>
              <Link
                href="/dashboard/notifications"
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/dashboard/notifications')
                    ? 'bg-orange-500/15 text-orange-600'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
                style={{ fontSize: '14px', fontWeight: isActive('/dashboard/notifications') ? 600 : 500 }}
              >
                <Bell size={18} className="shrink-0" />
                <span>Notifikasi</span>
                {unreadCount > 0 && (
                  <span className="ml-auto w-[18px] h-[18px] bg-red-500 text-white rounded-full flex items-center justify-center" style={{ fontSize: '10px', fontWeight: 700 }}>
                    {unreadCount}
                  </span>
                )}
              </Link>

              <div className="border-t border-slate-100 my-3" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                style={{ fontSize: '14px', fontWeight: 500 }}
              >
                <LogOut size={18} /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
