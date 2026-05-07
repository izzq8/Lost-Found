import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color?: string;
}

export function StatCard({ icon: Icon, value, label, color = "#ea580c" }: StatCardProps) {
  return (
    <div 
      className="rounded-xl md:rounded-2xl p-3.5 md:p-5 flex items-center gap-3 md:gap-4 relative overflow-hidden group transition-all duration-300" 
      style={{ 
        background: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 8px 32px rgba(234, 88, 12, 0.05)'
      }}
    >
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at right bottom, ${color}10 0%, transparent 70%)`
        }}
      />
      <div 
        className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 relative z-10" 
        style={{ 
          background: 'rgba(255, 255, 255, 0.8)',
          boxShadow: `0 4px 12px ${color}15`,
          border: '1px solid rgba(255,255,255,0.9)'
        }}
      >
        <Icon className="w-5 h-5 md:w-[26px] md:h-[26px]" style={{ color }} strokeWidth={2.5} />
      </div>
      <div className="relative z-10 min-w-0">
        <p className="text-xl md:text-[28px] font-extrabold text-slate-800 leading-tight md:leading-[1.2]">{value}</p>
        <p className="text-[10px] md:text-[13px] text-slate-500 font-medium md:font-semibold leading-tight md:leading-normal mt-0.5 md:mt-0">{label}</p>
      </div>
    </div>
  );
}
