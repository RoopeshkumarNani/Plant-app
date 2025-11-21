#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function cleanup() {
  console.log("🧹 Cleaning up broken data...");

  try {
    // Delete all images with old broken Replit URLs
    const { data: images } = await supabase.from("images").select("*");

    for (const img of images) {
      if (img.firebase_url && img.firebase_url.includes("/uploads/")) {
        console.log("🗑️  Deleting broken image:", img.id);
        await supabase.from("images").delete().eq("id", img.id);
      }
    }

    // Delete all flowers with no images
    const { data: flowers } = await supabase.from("flowers").select("*");
    for (const flower of flowers) {
      const { data: flowerImages } = await supabase
        .from("images")
        .select("*")
        .eq("flower_id", flower.id);

      if (!flowerImages || flowerImages.length === 0) {
        console.log("🗑️  Deleting empty flower:", flower.id);
        await supabase.from("flowers").delete().eq("id", flower.id);
      }
    }

    // Delete all plants with no images
    const { data: plants } = await supabase.from("plants").select("*");
    for (const plant of plants) {
      const { data: plantImages } = await supabase
        .from("images")
        .select("*")
        .eq("plant_id", plant.id);

      if (!plantImages || plantImages.length === 0) {
        console.log("🗑️  Deleting empty plant:", plant.id);
        await supabase.from("plants").delete().eq("id", plant.id);
      }
    }

    console.log("✅ Cleanup complete!");
  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

cleanup();
