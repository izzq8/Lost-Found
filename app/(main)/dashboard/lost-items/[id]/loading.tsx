export default function DetailLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse pb-12">
      <div className="h-5 w-48 bg-slate-200 rounded" />
      <div className="h-16 bg-slate-200 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="aspect-video bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="h-32 bg-slate-200 rounded-2xl" />
          <div className="h-24 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
