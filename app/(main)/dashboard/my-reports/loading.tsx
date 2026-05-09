export default function MyReportsLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-20 bg-slate-200 rounded-2xl" />
      <div className="flex gap-2">
        <div className="h-10 w-32 bg-slate-200 rounded-lg" />
        <div className="h-10 w-28 bg-slate-200 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 p-4 rounded-xl bg-slate-100">
            <div className="w-14 h-14 bg-slate-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-48 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
