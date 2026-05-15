import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log("🧹 1. Menghapus semua data dari Prisma...");

  // Hapus dari child ke parent untuk menghindari foreign key constraint error
  await prisma.foundMatchImage.deleteMany();
  await prisma.foundMatch.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.claimImage.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.reportImage.deleteMany();
  await prisma.report.deleteMany();
  await prisma.category.deleteMany();
  await prisma.enrollmentCode.deleteMany();
  await prisma.profile.deleteMany();

  console.log("🧹 2. Menghapus semua user dari Supabase Auth...");
  const { data: authData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;
  
  if (authData && authData.users) {
    for (const user of authData.users) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
    }
  }

  console.log("🌱 3. Membuat akun Admin tunggal...");
  const adminEmail = "admin@smkforwardnusantara.sch.id";
  const { data: adminAuth, error } = await supabaseAdmin.auth.admin.createUser({
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

  await prisma.profile.create({
    data: {
      id: adminAuth.user.id,
      email: adminEmail,
      name: "Super Admin",
      role: "ADMIN",
      jabatan: "FRONT_OFFICE",
      status: "ACTIVE",
    },
  });

  console.log("✅ Admin berhasil dibuat!");
  console.log("Email: admin@smkforwardnusantara.sch.id");
  console.log("Password: Admin@2026!");
}

main()
  .catch((e) => {
    console.error("❌ Reset gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
