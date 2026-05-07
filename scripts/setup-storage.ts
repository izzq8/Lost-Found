// Script untuk membuat storage buckets yang dibutuhkan di Supabase
// Jalankan: npx tsx scripts/setup-storage.ts

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const BUCKETS = [
  {
    name: "report-images",
    public: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
  },
  {
    name: "claim-images",
    public: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    fileSizeLimit: 5 * 1024 * 1024,
  },
  {
    name: "category-images",
    public: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
  },
  {
    name: "announcement-images",
    public: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    fileSizeLimit: 5 * 1024 * 1024,
  },
  {
    name: "found-match-images",
    public: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    fileSizeLimit: 5 * 1024 * 1024,
  },
];

async function main() {
  console.log("🗄️  Setting up Supabase Storage buckets...\n");

  for (const bucket of BUCKETS) {
    const { data: existing } = await supabaseAdmin.storage.getBucket(bucket.name);

    if (existing) {
      console.log(`⚠️  Bucket '${bucket.name}' sudah ada, skip.`);
      // Update bucket settings
      await supabaseAdmin.storage.updateBucket(bucket.name, {
        public: bucket.public,
        allowedMimeTypes: bucket.allowedMimeTypes,
        fileSizeLimit: bucket.fileSizeLimit,
      });
      console.log(`   → Settings diperbarui.`);
      continue;
    }

    const { error } = await supabaseAdmin.storage.createBucket(bucket.name, {
      public: bucket.public,
      allowedMimeTypes: bucket.allowedMimeTypes,
      fileSizeLimit: bucket.fileSizeLimit,
    });

    if (error) {
      console.error(`❌ Gagal membuat bucket '${bucket.name}':`, error.message);
    } else {
      console.log(`✅ Bucket '${bucket.name}' berhasil dibuat (public: ${bucket.public})`);
    }
  }

  console.log("\n🎉 Setup storage selesai!");
}

main().catch((e) => {
  console.error("Setup gagal:", e);
  process.exit(1);
});
