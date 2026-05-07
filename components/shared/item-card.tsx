import Link from 'next/link';
import { MapPin, Calendar } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { CategoryIcon } from './category-icon';

interface ItemCardProps {
  report: {
    id: string;
    type: string;
    status: string;
    itemName: string;
    location: string;
    date: Date;
    category: {
      name: string;
      imageUrl?: string;
    };
    reportImageUrl?: string; // foto asli barang (LOST: dari images[0].url)
  };
}

export function ItemCard({ report }: ItemCardProps) {
  // Translate REPORT TYPE into route path prefix
  const routePrefix = report.type === 'LOST' ? 'lost-items' : 'found-items';

  return (
    <Link 
      href={`/dashboard/${routePrefix}/${report.id}`}
      className="rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 block group"
      style={{ 
        background: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 4px 16px rgba(234, 88, 12, 0.04)'
      }}
    >
      <div 
        className="h-24 md:h-32 flex items-center justify-center relative overflow-hidden"
        style={{ background: '#F8FAFC' }}
      >
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(241,245,249,0.5) 100%)' }}
        />
        {report.type === 'LOST' ? (
          report.reportImageUrl ? (
            <img
              src={report.reportImageUrl}
              alt={report.itemName}
              className="w-full h-full object-cover"
            />
          ) : (
            <CategoryIcon
              name={report.category.name}
              imageUrl={undefined}
              fill
              size={36}
              className="text-slate-300"
            />
          )
        ) : (
          <CategoryIcon
            name={report.category.name}
            imageUrl={report.category.imageUrl}
            fill
            size={36}
            className="text-slate-300"
          />
        )}
      </div>
      <div className="p-3 md:p-4">
        <div className="flex items-center justify-between mb-1.5 md:mb-2">
          <span 
            className="px-1.5 md:px-2 py-0.5 rounded bg-white text-orange-600 text-[9px] md:text-[11px] font-semibold tracking-wide" 
            style={{ border: '1px solid rgba(234,88,12,0.1)' }}
          >
            {report.category.name}
          </span>
          <StatusBadge status={report.status} />
        </div>
        <h3 
          className="group-hover:text-orange-600 transition-colors truncate text-[13px] md:text-sm font-semibold text-slate-800"
        >
          {report.itemName}
        </h3>
        <div className="flex items-center gap-1.5 mt-1.5 md:mt-2 text-slate-500">
          <MapPin className="w-[10px] h-[10px] md:w-3 md:h-3 text-slate-400 shrink-0" />
          <span className="truncate text-[10px] md:text-xs font-medium">
            {report.location}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 md:mt-1.5 text-slate-400">
          <Calendar className="w-[10px] h-[10px] md:w-3 md:h-3 text-slate-400 shrink-0" />
          <span className="text-[9px] md:text-[11px]">
            {new Date(report.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
    </Link>
  );
}
