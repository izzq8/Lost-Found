import React from 'react';

// Indonesian status label mapping
const statusLabels: Record<string, string> = {
  PENDING: 'Menunggu Verifikasi',
  VERIFIED: 'Terverifikasi',
  CLAIMED: 'Selesai (Diklaim)',
  REJECTED: 'Ditolak',
  EXPIRED: 'Kedaluwarsa',
  APPROVED: 'Disetujui',
  PROCESSED: 'Diproses',
  COMPLETED: 'Selesai',
  AWAITING_PICKUP: 'Menunggu Diambil',
  ITEM_RECEIVED: 'Barang Diterima',
  RESOLVED: 'Selesai (Mandiri)',
  ACTIVE: 'Aktif',
  DEACTIVATED: 'Nonaktif',
  LOST: 'Hilang',
  FOUND: 'Ditemukan',
};

function localizeStatus(raw: string): string {
  return statusLabels[raw.toUpperCase()] ?? raw;
}

interface PageHeroProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  variant?: 'large' | 'default' | 'compact';
  children?: React.ReactNode;
  badge?: string;
}

export function PageHero({
  title,
  subtitle,
  icon: Icon,
  variant = 'default',
  children,
  badge,
}: PageHeroProps) {

  const containerPaddingY = variant === 'large' ? 'py-5 md:py-8' : variant === 'default' ? 'py-4 md:py-6' : 'py-3 md:py-5';
  const containerPaddingX = variant === 'large' ? 'px-5 md:px-8' : 'px-4 md:px-6';
  
  const titleClasses = variant === 'large' 
     ? 'text-xl md:text-[28px]' 
     : variant === 'default' 
     ? 'text-lg md:text-[22px]' 
     : 'text-base md:text-[20px]';

  const iconContainerSize = variant === 'large' ? 'w-12 h-12 md:w-16 md:h-16' : variant === 'default' ? 'w-10 h-10 md:w-[52px] md:h-[52px]' : 'w-8 h-8 md:w-11 md:h-11';
  const iconPixelSize = variant === 'large' ? 'w-6 h-6 md:w-11 md:h-11' : variant === 'default' ? 'w-5 h-5 md:w-9 md:h-9' : 'w-4 h-4 md:w-7 md:h-7';

  const displayBadge = badge ? localizeStatus(badge) : undefined;

  return (
    <div
      className="relative overflow-hidden rounded-2xl md:rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fdba74 100%)',
      }}
    >
      {/* Flat content — no decorative bubbles */}
      <div className={`relative ${containerPaddingY} ${containerPaddingX}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            {Icon && (
              <div
                className={`${iconContainerSize} rounded-xl flex items-center justify-center shrink-0`}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <Icon className={`${iconPixelSize} text-white`} style={{ opacity: 0.95 }} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className={`text-white drop-shadow-md font-extrabold ${titleClasses} leading-[1.2] md:leading-[1.3] [text-wrap:balance] line-clamp-2`}
                >
                  {title}
                </h1>
                {displayBadge && (
                  <span
                    className="rounded-full px-2 py-0.5 md:px-2.5 md:py-0.5 shrink-0"
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      background: 'rgba(255,255,255,0.25)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    {displayBadge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p
                  className={variant === 'large' ? 'text-xs md:text-[15px]' : 'text-[11px] md:text-[13px]'}
                  style={{
                    color: 'rgba(255,255,255,0.9)',
                    marginTop: '2px',
                    lineHeight: 1.4,
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
        </div>
      </div>
    </div>
  );
}
