import React from 'react';

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

  // Gunakan tailwind string class murni yang responsive
  // Kita abaikan inline style kaku untuk form padding & size
  const containerPaddingY = variant === 'large' ? 'py-5 md:py-8' : variant === 'default' ? 'py-4 md:py-6' : 'py-3 md:py-5';
  const containerPaddingX = variant === 'large' ? 'px-5 md:px-8' : 'px-4 md:px-6';
  
  const titleClasses = variant === 'large' 
     ? 'text-xl md:text-[28px]' 
     : variant === 'default' 
     ? 'text-lg md:text-[22px]' 
     : 'text-base md:text-[20px]';

  const iconContainerSize = variant === 'large' ? 'w-12 h-12 md:w-16 md:h-16' : variant === 'default' ? 'w-10 h-10 md:w-[52px] md:h-[52px]' : 'w-8 h-8 md:w-11 md:h-11';
  const iconPixelSize = variant === 'large' ? 'w-6 h-6 md:w-11 md:h-11' : variant === 'default' ? 'w-5 h-5 md:w-9 md:h-9' : 'w-4 h-4 md:w-7 md:h-7';

  return (
    <div
      className="relative overflow-hidden rounded-2xl md:rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fdba74 100%)', // Adjusted to bright orange theme
      }}
    >
      {/* Decorative floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute rounded-full"
          style={{
            width: variant === 'large' ? '200px' : '140px',
            height: variant === 'large' ? '200px' : '140px',
            background: 'rgba(255,255,255,0.1)',
            top: '-40px',
            right: '-20px',
          }}
        />
        <div
           className="absolute rounded-full hidden md:block"
          style={{
            width: variant === 'large' ? '120px' : '80px',
            height: variant === 'large' ? '120px' : '80px',
            background: 'rgba(255,255,255,0.08)',
            bottom: '-30px',
            right: variant === 'large' ? '120px' : '60px',
          }}
        />
        <div
          className="absolute rounded-full hidden md:block"
          style={{
            width: '60px',
            height: '60px',
            background: 'rgba(255,255,255,0.15)',
            top: '20px',
            left: variant === 'large' ? '40%' : '60%',
          }}
        />
        {variant === 'large' && (
          <>
            <div
              className="absolute rounded-full hidden md:block"
              style={{
                width: '160px',
                height: '160px',
                background: 'rgba(255,255,255,0.05)',
                bottom: '-60px',
                left: '-40px',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255,255,255,0.12)',
                top: '50%',
                right: '30%',
              }}
            />
          </>
        )}
      </div>

      {/* Glass overlay */}
      <div
        className={`relative ${containerPaddingY} ${containerPaddingX}`}
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            {Icon && (
              <div
                className={`${iconContainerSize} rounded-xl flex items-center justify-center shrink-0`}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
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
                {badge && (
                  <span
                    className="rounded-full px-2 py-0.5 md:px-2.5 md:py-0.5 shrink-0"
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      background: 'rgba(255,255,255,0.25)',
                      backdropFilter: 'blur(4px)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    {badge}
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
