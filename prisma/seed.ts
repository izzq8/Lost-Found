// prisma/seed.ts
// Seed data awal untuk sistem Lost & Found SMK Forward Nusantara
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import "dotenv/config";

// Gunakan DIRECT_URL untuk seed (bukan pooled connection)
const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Super Admin (buat di Supabase Auth + profile di DB)
  const adminEmail = "admin@smkforwardnusantara.sch.id";

  // Cek apakah sudah ada
  const { data: existingUsers } =
    await supabaseAdmin.auth.admin.listUsers();
  const existingAdmin = existingUsers?.users?.find(
    (u) => u.email === adminEmail
  );

  let adminId: string;

  if (existingAdmin) {
    adminId = existingAdmin.id;
    console.log("⚠️  Super Admin sudah ada, skip create.");
  } else {
    const { data: adminAuth, error } =
      await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: "Admin@2026!",
        email_confirm: true,
        user_metadata: {
          name: "Super Admin",
          role: "ADMIN",
          jabatan: "FRONT_OFFICE",
        },
      });

    if (error || !adminAuth.user) {
      throw new Error(`Gagal buat admin: ${error?.message}`);
    }

    adminId = adminAuth.user.id;
    console.log("✅ Super Admin dibuat di Supabase Auth");
  }

  // Upsert profile admin
  await prisma.profile.upsert({
    where: { id: adminId },
    create: {
      id: adminId,
      email: adminEmail,
      name: "Super Admin",
      role: "ADMIN",
      jabatan: "FRONT_OFFICE",
      status: "ACTIVE",
    },
    update: {},
  });
  console.log("✅ Profile Admin tersimpan di database");

  // 2. Enrollment Codes (Siswa & Guru)
  // Cek apakah sudah ada active code
  const existingSiswaCode = await prisma.enrollmentCode.findFirst({
    where: { type: "SISWA", status: "ACTIVE" },
  });
  const existingGuruCode = await prisma.enrollmentCode.findFirst({
    where: { type: "GURU", status: "ACTIVE" },
  });

  const siswaCode = existingSiswaCode
    ? existingSiswaCode.code
    : `FWD-SISWA-${nanoid(6).toUpperCase()}`;
  const guruCode = existingGuruCode
    ? existingGuruCode.code
    : `FWD-GURU-${nanoid(6).toUpperCase()}`;

  if (!existingSiswaCode) {
    await prisma.enrollmentCode.create({
      data: {
        code: siswaCode,
        type: "SISWA",
        status: "ACTIVE",
        createdBy: adminId,
      },
    });
  }

  if (!existingGuruCode) {
    await prisma.enrollmentCode.create({
      data: {
        code: guruCode,
        type: "GURU",
        status: "ACTIVE",
        createdBy: adminId,
      },
    });
  }

  console.log("✅ Enrollment Codes:");
  console.log(`   Siswa : ${siswaCode}`);
  console.log(`   Guru  : ${guruCode}`);

  // 3. Kategori Barang (dengan placeholder imageUrl)
  // Admin harus upload gambar kategori via panel admin setelah deployment
  const categories = [
    {
      name: "Elektronik",
      imageUrl: "/images/categories/elektronik.png",
    },
    {
      name: "Tas & Dompet",
      imageUrl: "/images/categories/tas-dompet.png",
    },
    {
      name: "Pakaian & Aksesoris",
      imageUrl: "/images/categories/pakaian-aksesoris.png",
    },
    {
      name: "Alat Tulis & Buku",
      imageUrl: "/images/categories/alat-tulis-buku.png",
    },
    {
      name: "Kartu & Identitas",
      imageUrl: "/images/categories/kartu-identitas.png",
    },
    {
      name: "Botol & Tempat Makan",
      imageUrl: "/images/categories/botol-makan.png",
    },
    {
      name: "Kunci",
      imageUrl: "/images/categories/kunci.png",
    },
    {
      name: "Perlengkapan Olahraga",
      imageUrl: "/images/categories/olahraga.png",
    },
    {
      name: "Perhiasan & Barang Berharga",
      imageUrl: "/images/categories/perhiasan.png",
    },
    {
      name: "Lainnya",
      imageUrl: "/images/categories/lainnya.png",
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      create: cat,
      update: {},
    });
  }
  console.log(`✅ ${categories.length} Kategori dibuat`);

  // 4. Dummy Data for UI (Reports, Announcements, Notifications)
  // Buat Dummy User Siswa untuk jadi pelapor
  let demoSiswaId: string;
  const demoSiswaEmail = "siswa.demo@smkforwardnusantara.sch.id";
  const { data: existingSiswa } = await supabaseAdmin.auth.admin.listUsers();
  const foundSiswa = existingSiswa?.users?.find(u => u.email === demoSiswaEmail);

  if (foundSiswa) {
    demoSiswaId = foundSiswa.id;
  } else {
    const { data: authSiswa } = await supabaseAdmin.auth.admin.createUser({
      email: demoSiswaEmail,
      password: "Password123!",
      email_confirm: true,
      user_metadata: { name: "Ahmad Rizki (Demo)", role: "USER", jabatan: "SISWA" }
    });
    demoSiswaId = authSiswa.user!.id;
  }

  await prisma.profile.upsert({
    where: { id: demoSiswaId },
    create: {
      id: demoSiswaId, email: demoSiswaEmail, name: "Ahmad Rizki (Demo)",
      role: "USER", jabatan: "SISWA", status: "ACTIVE"
    },
    update: {}
  });

  // Dummy Announcement
  const existingAnnouncements = await prisma.announcement.count();
  if (existingAnnouncements === 0) {
    await prisma.announcement.create({
      data: {
        title: "Jadwal Piket Keamanan April 2026",
        content: "Berikut jadwal piket keamanan untuk bulan April 2026. Harap semua petugas mengecek jadwal masing-masing.",
        publishAt: new Date(),
        expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        createdBy: adminId
      }
    });
    console.log("✅ Dummy Announcement dibuat");
  }

  // Dummy Reports
  const existingReports = await prisma.report.count();
  if (existingReports === 0) {
    // Cari kategori IDs
    const kElektronik = await prisma.category.findUnique({ where: { name: "Elektronik" } });
    const kDompet = await prisma.category.findUnique({ where: { name: "Uang / Dompet" } });
    const kAlatTulis = await prisma.category.findUnique({ where: { name: "Alat Tulis" } });

    if (kElektronik && kDompet && kAlatTulis) {
      await prisma.report.createMany({
        data: [
          {
            itemName: "Charger iPhone", description: "Hilang di Ruang Kelas XI-4",
            type: "LOST", status: "PENDING", location: "Ruang Kelas XI-4",
            date: new Date(), reporterId: demoSiswaId, categoryId: kElektronik.id
          },
          {
            itemName: "Dompet Hitam", description: "Ada KTP atas nama Budi",
            type: "FOUND", status: "VERIFIED", location: "Kantin Utama",
            date: new Date(), reporterId: demoSiswaId, categoryId: kDompet.id
          },
          {
            itemName: "Buku Matematika", description: "Buku paket tertinggal",
            type: "LOST", status: "VERIFIED", location: "Perpustakaan",
            date: new Date(), reporterId: demoSiswaId, categoryId: kAlatTulis.id
          },
          {
            itemName: "Flash Disk 32GB", description: "Ditemukan dekat komputer 3",
            type: "FOUND", status: "VERIFIED", location: "Lab Komputer 3",
            date: new Date(), reporterId: demoSiswaId, categoryId: kElektronik.id
          }
        ]
      });
      console.log("✅ Dummy Reports dibuat");
    }
  }

  console.log("\n🎉 Seeding selesai!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 Ringkasan:");
  console.log(`   Admin email    : ${adminEmail}`);
  console.log(`   Admin password : Admin@2026! (GANTI SETELAH DEPLOY!)`);
  console.log(`   Siswa Dummy    : ${demoSiswaEmail} (Password123!)`);
  console.log(`   Enrollment Siswa: ${siswaCode}`);
  console.log(`   Enrollment Guru : ${guruCode}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("❌ Seeding gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
