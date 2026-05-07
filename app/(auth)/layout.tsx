import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Lost & Found SMK Forward Nusantara",
    default: "Auth | Lost & Found SMK Forward Nusantara",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ornamen (Orange Blobs) untuk efek Glassmorphism */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-400 rounded-full mix-blend-multiply opacity-20 blur-[100px] animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-amber-400 rounded-full mix-blend-multiply opacity-20 blur-[100px] animate-[pulse_10s_ease-in-out_infinite_reverse]" />
      <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-orange-500 rounded-full mix-blend-multiply opacity-20 blur-[120px] animate-[pulse_12s_ease-in-out_infinite]" />

      {/* Kontainer Utama */}
      <div className="w-full max-w-md relative z-10">{children}</div>
    </div>
  );
}
