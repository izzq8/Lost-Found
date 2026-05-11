"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Plus,
  Eye,
  FileText,
  X,
  AlertTriangle,
  Search,
} from "lucide-react";

const tabs = [
  { icon: LayoutDashboard, label: "Beranda", href: "/dashboard" },
  { icon: Package, label: "Hilang", href: "/dashboard/lost-items" },
  { id: "fab", icon: Plus, label: "Lapor", href: "#" },
  { icon: Eye, label: "Ditemukan", href: "/dashboard/found-items" },
  { icon: FileText, label: "Riwayat", href: "/dashboard/my-reports" },
];

interface MobileBottomNavProps {
  totalActionableBadge?: number;
}

export default function MobileBottomNav({ totalActionableBadge = 0 }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [showLaporSheet, setShowLaporSheet] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close sheet on route change
  useEffect(() => {
    setShowLaporSheet(false);
  }, [pathname]);

  // Close sheet on outside click
  useEffect(() => {
    if (!showLaporSheet) return;
    const handler = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setShowLaporSheet(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLaporSheet]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* Overlay + Action Sheet */}
      {showLaporSheet && (
        <div className="lg:hidden fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowLaporSheet(false)}
          />
          <div
            ref={sheetRef}
            className="absolute bottom-[76px] left-4 right-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
            style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#1E293B",
                }}
              >
                Buat Laporan
              </h3>
              <button
                onClick={() => setShowLaporSheet(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <Link
                href="/dashboard/report/lost"
                className="flex items-center gap-3.5 p-4 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors"
                onClick={() => setShowLaporSheet(false)}
              >
                <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-red-500" />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#1E293B",
                    }}
                  >
                    Lapor Barang Hilang
                  </p>
                  <p style={{ fontSize: "12px", color: "#64748B" }}>
                    Laporkan barang yang hilang
                  </p>
                </div>
              </Link>
              <Link
                href="/dashboard/report/found"
                className="flex items-center gap-3.5 p-4 rounded-xl border border-green-100 bg-green-50/50 hover:bg-green-50 transition-colors"
                onClick={() => setShowLaporSheet(false)}
              >
                <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <Search size={20} className="text-green-600" />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#1E293B",
                    }}
                  >
                    Lapor Barang Ditemukan
                  </p>
                  <p style={{ fontSize: "12px", color: "#64748B" }}>
                    Laporkan barang yang Anda temukan
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[60]"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: "1px solid rgba(0,0,0,0.06)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-center justify-around h-[60px] max-w-md mx-auto px-2">
          {tabs.map((tab) => {
            if (tab.id === "fab") {
              // FAB center button
              return (
                <button
                  key="fab"
                  onClick={() => setShowLaporSheet(!showLaporSheet)}
                  className="flex flex-col items-center justify-center cursor-pointer -mt-5"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
                    style={{
                      background:
                        "linear-gradient(135deg, #EA580C 0%, #F97316 100%)",
                      boxShadow: "0 4px 14px rgba(234, 88, 12, 0.4)",
                    }}
                  >
                    <Plus
                      size={24}
                      className={`text-white transition-transform duration-200 ${showLaporSheet ? "rotate-45" : ""}`}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: showLaporSheet ? "#EA580C" : "#94A3B8",
                      marginTop: "2px",
                    }}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            }

            const active = tab.href === "/dashboard/my-reports"
              ? (isActive("/dashboard/my-reports") || isActive("/dashboard/my-claims") || isActive("/dashboard/my-found-matches"))
              : isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 min-w-[52px] transition-colors"
              >
                <tab.icon
                  size={20}
                  className={`transition-colors ${active ? "text-orange-600" : "text-slate-400"}`}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: active ? 600 : 500,
                    color: active ? "#EA580C" : "#94A3B8",
                  }}
                >
                  {tab.label}
                </span>
                {active && (
                  <div
                    className="w-1 h-1 rounded-full bg-orange-500"
                    style={{ marginTop: "-1px" }}
                  />
                )}
                {tab.href === "/dashboard/my-reports" && totalActionableBadge > 0 && !active && (
                  <div
                    className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-green-500 border-2 border-white flex items-center justify-center"
                  >
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'white' }}>{totalActionableBadge}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
