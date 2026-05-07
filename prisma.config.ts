import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Prisma 7: seed command dikonfigurasi di sini
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Selalu gunakan DIRECT_URL (port 5432) untuk CLI operations
    // Runtime queries menggunakan DATABASE_URL (port 6543) via PrismaPg adapter
    url: process.env["DIRECT_URL"],
  },
});
