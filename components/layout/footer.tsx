import Link from 'next/link';
import { Search, MapPin, Phone, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer
      className="relative mt-12 w-full pb-[76px] lg:pb-0"
      style={{
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid rgba(255,255,255,0.8)',
        boxShadow: '0 -4px 24px -12px rgba(0,0,0,0.05)'
      }}
    >
      <div className="max-w-[1440px] mx-auto px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
          {/* Brand & Description */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5 w-fit">
              <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Search size={18} className="text-white" />
              </div>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', letterSpacing: '-0.02em' }}>
                LostFound <span className="text-orange-500">SMKFN</span>
              </span>
            </Link>
            <p className="text-slate-600 leading-relaxed" style={{ fontSize: '14px', maxWidth: '320px' }}>
              Platform resmi sekolah untuk melaporkan kehilangan dan penemuan barang. Membantu menciptakan lingkungan sekolah yang aman dan jujur.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Shortcut</h3>
            <ul className="flex flex-col gap-3">
              {[
                { label: 'Beranda', href: '/dashboard' },
                { label: 'Daftar Barang Hilang', href: '/dashboard/lost-items' },
                { label: 'Daftar Barang Ditemukan', href: '/dashboard/found-items' },
                { label: 'Lapor Kehilangan', href: '/dashboard/report/lost' },
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    href={link.href}
                    className="text-slate-600 hover:text-orange-500 transition-colors w-fit"
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-4">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Kontak & Bantuan</h3>
            <ul className="flex flex-col gap-4">
              <li className="flex items-start gap-3 text-slate-600">
                <div className="mt-0.5 p-1.5 rounded-lg bg-orange-50 text-orange-500 shrink-0">
                  <MapPin size={16} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>Ruang Tata Usaha (TU)</p>
                  <p style={{ fontSize: '13px', marginTop: '2px' }}>Gedung Utama Lantai 1, SMKFN</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-slate-600">
                <div className="mt-0.5 p-1.5 rounded-lg bg-orange-50 text-orange-500 shrink-0">
                  <Phone size={16} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>WhatsApp Admin</p>
                  <p style={{ fontSize: '13px', marginTop: '2px' }}>+62 812 3456 7890</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-slate-600">
                <div className="mt-0.5 p-1.5 rounded-lg bg-orange-50 text-orange-500 shrink-0">
                  <Mail size={16} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>Email Support</p>
                  <p style={{ fontSize: '13px', marginTop: '2px' }}>admin@smkfn.sch.id</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-4">
          <p style={{ fontSize: '13px', color: '#64748B' }}>
            © {new Date().getFullYear()} SMKFN. Hak Cipta Dilindungi.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-slate-500 hover:text-orange-500 transition-colors" style={{ fontSize: '13px', fontWeight: 500 }}>
              Kebijakan Privasi
            </Link>
            <Link href="#" className="text-slate-500 hover:text-orange-500 transition-colors" style={{ fontSize: '13px', fontWeight: 500 }}>
              Syarat & Ketentuan
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
