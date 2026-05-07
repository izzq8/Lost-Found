"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/actions/notification.actions";
import { getNotificationHref } from "@/lib/utils/notification-href";
import {
  Bell, CheckCheck, FileText, AlertTriangle, MessageSquare, Shield, Clock,
  Megaphone, ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  data: Record<string, string> | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, typeof Bell> = {
  REPORT_VERIFIED: FileText,
  REPORT_REJECTED: AlertTriangle,
  REPORT_NEAR_EXPIRY: Clock,
  REPORT_EXPIRED: AlertTriangle,
  CLAIM_SUBMITTED: FileText,
  CLAIM_APPROVED: CheckCheck,
  CLAIM_REJECTED: AlertTriangle,
  CLAIM_COMPLETED: CheckCheck,
  NEW_COMMENT: MessageSquare,
  PASSWORD_RESET_PROCESSED: Shield,
  ANNOUNCEMENT_NEW: Megaphone,
};

const TYPE_COLOR: Record<string, string> = {
  REPORT_VERIFIED: "text-green-600 bg-green-50",
  REPORT_REJECTED: "text-red-500 bg-red-50",
  REPORT_NEAR_EXPIRY: "text-amber-600 bg-amber-50",
  REPORT_EXPIRED: "text-slate-500 bg-slate-100",
  CLAIM_SUBMITTED: "text-blue-600 bg-blue-50",
  CLAIM_APPROVED: "text-green-600 bg-green-50",
  CLAIM_REJECTED: "text-red-500 bg-red-50",
  CLAIM_COMPLETED: "text-green-600 bg-green-50",
  NEW_COMMENT: "text-orange-600 bg-orange-50",
  PASSWORD_RESET_PROCESSED: "text-purple-600 bg-purple-50",
  ANNOUNCEMENT_NEW: "text-orange-600 bg-orange-50",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function groupByDate(items: NotificationItem[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: NotificationItem[] }[] = [];
  const todayItems: NotificationItem[] = [];
  const yesterdayItems: NotificationItem[] = [];
  const olderItems: NotificationItem[] = [];

  items.forEach((n) => {
    const d = new Date(n.createdAt);
    if (d.toDateString() === today.toDateString()) todayItems.push(n);
    else if (d.toDateString() === yesterday.toDateString()) yesterdayItems.push(n);
    else olderItems.push(n);
  });

  if (todayItems.length) groups.push({ label: "Hari Ini", items: todayItems });
  if (yesterdayItems.length) groups.push({ label: "Kemarin", items: yesterdayItems });
  if (olderItems.length) groups.push({ label: "Sebelumnya", items: olderItems });

  return groups;
}

export default function NotificationsClient({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const hasUnread = notifications.some((n) => !n.isRead);

  const handleMarkAll = async () => {
    setLoading(true);
    await markAllNotificationsAsRead(pathname);
    router.refresh();
    setLoading(false);
  };

  const handleMarkOne = async (id: string) => {
    await markNotificationAsRead(id);
    router.refresh();
  };

  const groups = groupByDate(notifications);

  return (
    <div className="flex flex-col gap-4">
      {hasUnread && (
        <div className="flex justify-end">
          <button
            onClick={handleMarkAll}
            disabled={loading}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-orange-50 text-orange-600 text-xs font-semibold hover:bg-orange-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <CheckCheck size={14} />
            Tandai semua dibaca
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
          <Bell size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Belum ada notifikasi.</p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.label}>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              {group.label}
            </h3>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {group.items.map((n, i) => {
                const Icon = TYPE_ICON[n.type] || Bell;
                const colorClass = TYPE_COLOR[n.type] || "text-slate-500 bg-slate-100";
                const href = getNotificationHref(n.type, n.data, "USER");

                const handleClick = async () => {
                  if (!n.isRead) await handleMarkOne(n.id);
                };

                const inner = (
                  <>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${!n.isRead ? "text-slate-800 font-medium" : "text-slate-600"}`}>
                        {n.message}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 shrink-0" />
                    )}
                    {href && (
                      <ExternalLink size={14} className="text-slate-300 shrink-0 mt-1" />
                    )}
                  </>
                );

                const cls = `flex items-start gap-3 p-4 ${i < group.items.length - 1 ? "border-b border-slate-50" : ""} ${
                  !n.isRead ? "bg-orange-50/30" : ""
                } hover:bg-orange-50/60 transition-colors cursor-pointer`;

                return href ? (
                  <Link key={n.id} href={href} onClick={handleClick} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id} onClick={handleClick} className={cls}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
