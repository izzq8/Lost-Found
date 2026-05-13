"use client";

import dynamic from "next/dynamic";

interface AdminDashboardChartsProps {
  monthlyData: { month: string; hilang: number; ditemukan: number }[];
  statusData: { name: string; value: number }[];
}

const AdminDashboardCharts = dynamic(() => import("./admin-dashboard-charts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
      <div className="lg:col-span-2 h-80 bg-slate-200 rounded-2xl" />
      <div className="h-80 bg-slate-200 rounded-2xl" />
    </div>
  ),
});

export default function AdminDashboardChartsLazy(props: AdminDashboardChartsProps) {
  return <AdminDashboardCharts {...props} />;
}
