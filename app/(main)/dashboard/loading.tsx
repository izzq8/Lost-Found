export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* PageHero Skeleton */}
      <div className="h-20 bg-slate-200 rounded-2xl" />

      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
        ))}
      </div>

      {/* Item Cards Skeleton */}
      <div className="h-6 w-48 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden">
            <div className="h-24 md:h-32 bg-slate-200" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-20 bg-slate-200 rounded" />
              <div className="h-4 w-full bg-slate-200 rounded" />
              <div className="h-3 w-24 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
