import React from 'react';

// Menyesuaikan konfigurasi warna berdasarkan ReportStatus | ClaimStatus dari Prisma Enum
const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
  VERIFIED: { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-500' },
  CLAIMED: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-600' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  EXPIRED: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-500' },
  APPROVED: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-600' },
  PROCESSED: { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-500' },
  COMPLETED: { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500' },
  AWAITING_PICKUP: { bg: 'bg-sky-50', text: 'text-sky-600', dot: 'bg-sky-500' },
  ITEM_RECEIVED: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
  RESOLVED: { bg: 'bg-teal-50', text: 'text-teal-600', dot: 'bg-teal-500' },
  ACTIVE: { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500' },
  DEACTIVATED: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-500' },
};

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const normalizedStatus = status.toUpperCase();
  const config = statusConfig[normalizedStatus] || { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-500' };
  
  // Custom display labels for specific statuses
  const displayLabels: Record<string, string> = {
    PENDING: "Pending",
    VERIFIED: "Verified",
    CLAIMED: "Claimed",
    REJECTED: "Ditolak",
    EXPIRED: "Kedaluwarsa",
    APPROVED: "Disetujui",
    PROCESSED: "Diproses",
    COMPLETED: "Selesai",
    AWAITING_PICKUP: "Menunggu Diambil",
    ITEM_RECEIVED: "Barang Diterima",
    RESOLVED: "Selesai (Mandiri)",
    ACTIVE: "Aktif",
    DEACTIVATED: "Nonaktif"
  };

  const label = displayLabels[normalizedStatus] || status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${config.bg} ${config.text} ${className}`}
      style={{ fontSize: '12px', fontWeight: 600, lineHeight: '16px' }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {label}
    </span>
  );
}
