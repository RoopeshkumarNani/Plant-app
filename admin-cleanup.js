#!/usr/bin/env node
/**
 * Admin cleanup script - Delete all plants, flowers, and images from Supabase
 * Usage: node admin-cleanup.js
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL || "https://yvpoabomcnwegjvfwtav.supabase.co",
  process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cG9hYm9tY253ZWdqdmZ3dGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTg0OTcsImV4cCI6MjA3ODgzNDQ5N30.uGZx7pysf0lwkBT7UeoWV0Hwg42BOz5QtKF_j6ec3EY"
);

async function cleanup() {
  try {
    console.log("🗑️  Starting database cleanup...\n");

    console.log("1️⃣  Deleting conversations...");
    const { data: convs } = await supabase.from("conversations").select("id");
    if (convs && convs.length > 0) {
      const ids = convs.map((c) => c.id);
      const { error: convErr } = await supabase
        .from("conversations")
        .delete()
        .in("id", ids);
      if (convErr) throw convErr;
    }
    console.log("   ✅ Deleted conversations\n");

    console.log("2️⃣  Deleting images...");
    const { data: imgs } = await supabase.from("images").select("id");
    if (imgs && imgs.length > 0) {
      const ids = imgs.map((i) => i.id);
      const { error: imgErr } = await supabase
        .from("images")
        .delete()
        .in("id", ids);
      if (imgErr) throw imgErr;
    }
    console.log("   ✅ Deleted images\n");

    console.log("3️⃣  Deleting flowers...");
    const { data: flowers } = await supabase.from("flowers").select("id");
    if (flowers && flowers.length > 0) {
      const ids = flowers.map((f) => f.id);
      const { error: flowerErr } = await supabase
        .from("flowers")
        .delete()
        .in("id", ids);
      if (flowerErr) throw flowerErr;
    }
    console.log("   ✅ Deleted flowers\n");

    console.log("4️⃣  Deleting plants...");
    const { data: plants } = await supabase.from("plants").select("id");
    if (plants && plants.length > 0) {
      const ids = plants.map((p) => p.id);
      const { error: plantErr } = await supabase
        .from("plants")
        .delete()
        .in("id", ids);
      if (plantErr) throw plantErr;
    }
    console.log("   ✅ Deleted plants\n");

    console.log("================================");
    console.log("✅ CLEANUP COMPLETE!");
    console.log("================================");
    console.log("\n🎉 Database is now clean. Ready for new uploads!\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
    process.exit(1);
  }
}

cleanup();
