"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#FDBA74",
  VERIFIED: "#FB923C",
  CLAIMED: "#EA580C",
  REJECTED: "#9A3412",
  EXPIRED: "#FED7AA",
};

export default function AdminDashboardCharts({
  monthlyData,
  statusData,
}: {
  monthlyData: { month: string; hilang: number; ditemukan: number }[];
  statusData: { name: string; value: number }[];
}) {
  const total = statusData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Bar Chart */}
      <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-sm lg:col-span-2">
        <div className="mb-6">
          <h3 className="text-base font-bold text-slate-800">Laporan per Bulan</h3>
          <p className="text-sm text-slate-500">Statistik tren laporan 6 bulan terakhir</p>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "#FFF7ED" }}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(234,88,12,0.1)" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} iconType="circle" />
              <Bar dataKey="hilang" name="Hilang" fill="#EA580C" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Bar dataKey="ditemukan" name="Ditemukan" fill="#FDBA74" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut Chart */}
      <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-sm flex flex-col">
        <div className="mb-2">
          <h3 className="text-base font-bold text-slate-800">Distribusi Status</h3>
          <p className="text-sm text-slate-500">Persentase status laporan saat ini</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                innerRadius={70}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                animationDuration={1000}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#EA580C"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(234,88,12,0.1)" }}
                itemStyle={{ color: "#1E293B", fontWeight: 600 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-extrabold text-slate-800">{total}</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-y-3 mt-4">
          {statusData.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shadow-inner" style={{ background: STATUS_COLORS[d.name] || "#EA580C" }} />
              <span className="text-xs font-medium text-slate-600">
                {d.name} <span className="text-slate-400 ml-1">({d.value})</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
