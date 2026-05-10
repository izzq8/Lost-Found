export default function AdminDashboardLoading() {
  return (
    <div className="flex flex-col gap-8 pb-10 animate-pulse">
      <div className="h-20 bg-slate-200 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-200 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-slate-200 rounded-2xl" />
        <div className="h-80 bg-slate-200 rounded-2xl" />
      </div>
    </div>
  );
}
