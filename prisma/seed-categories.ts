// prisma/seed-categories.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

// Gunakan DIRECT_URL untuk seed (bukan pooled connection)
const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Categories...");

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

  console.log("-----------------------------------------");
  for (const cat of categories) {
    const result = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    console.log(`✅ Category: ${result.name}`);
  }
  console.log("-----------------------------------------");
  console.log(`🎉 Total ${categories.length} kategori berhasil di-seed.`);
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
