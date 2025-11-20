require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL || "https://yvpoabomcnwegjvfwtav.supabase.co",
  process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cG9hYm9tY253ZWdqdmZ3dGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTg0OTcsImV4cCI6MjA3ODgzNDQ5N30.uGZx7pysf0lwkBT7UeoWV0Hwg42BOz5QtKF_j6ec3EY"
);

async function fixImageUrls() {
  try {
    console.log("🔧 Fixing image URLs in Supabase...\n");

    // Get all images
    const { data: images, error: selectErr } = await supabase
      .from("images")
      .select("*");

    if (selectErr) {
      console.error("❌ Failed to fetch images:", selectErr.message);
      process.exit(1);
    }

    if (!images || images.length === 0) {
      console.log("✅ No images to fix");
      process.exit(0);
    }

    console.log(`Found ${images.length} images to fix\n`);

    let fixed = 0;
    for (const img of images) {
      if (img.firebase_url && img.firebase_url.startsWith("http://")) {
        // Convert http:// to https://
        const newUrl = img.firebase_url.replace("http://", "https://");
        const { error: updateErr } = await supabase
          .from("images")
          .update({ firebase_url: newUrl })
          .eq("id", img.id);

        if (updateErr) {
          console.error(`❌ Failed to update ${img.id}:`, updateErr.message);
        } else {
          console.log(`✅ Fixed: ${img.id}`);
          console.log(`   ${img.firebase_url}`);
          console.log(`   → ${newUrl}\n`);
          fixed++;
        }
      }
    }

    console.log("================================");
    console.log(`✅ FIXED ${fixed} image URLs!`);
    console.log("================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixImageUrls();
