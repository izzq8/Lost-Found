export default function AdminListLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-5 w-48 bg-slate-200 rounded" />
      <div className="h-20 bg-slate-200 rounded-2xl" />
      <div className="h-10 w-64 bg-slate-200 rounded-xl" />
      <div className="bg-white rounded-2xl border border-slate-100 p-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-50 last:border-b-0">
            <div className="w-10 h-10 bg-slate-200 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-24 bg-slate-200 rounded" />
            </div>
            <div className="h-6 w-16 bg-slate-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
