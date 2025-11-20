#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function deleteOldData() {
  try {
    console.log("🗑️  Deleting old Render images and flowers...");

    // Get all images
    const { data: images } = await supabase.from("images").select("*");

    // Delete old Render images
    let deletedCount = 0;
    for (const img of images) {
      if (img.firebase_url && img.firebase_url.includes("onrender")) {
        await supabase.from("images").delete().eq("id", img.id);
        console.log(`✅ Deleted image ${img.id}`);
        deletedCount++;
      }
    }

    // Delete orphaned flowers with no images
    const { data: flowers } = await supabase.from("flowers").select("*");
    let flowersDeleted = 0;
    for (const flower of flowers) {
      const { data: flowerImages } = await supabase
        .from("images")
        .select("*")
        .eq("flower_id", flower.id);

      if (!flowerImages || flowerImages.length === 0) {
        await supabase.from("flowers").delete().eq("id", flower.id);
        console.log(`✅ Deleted empty flower ${flower.species}`);
        flowersDeleted++;
      }
    }

    console.log(
      `\n✅ Complete! Deleted ${deletedCount} images and ${flowersDeleted} flowers.`
    );
    console.log("Start fresh - upload new images and they'll use Replit URLs!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

deleteOldData();
