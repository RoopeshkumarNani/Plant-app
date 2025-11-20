#!/usr/bin/env node

/**
 * Migration script to update all image URLs from Render to Replit
 * Usage: node migrate-urls-to-replit.js
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const RENDER_URL = "https://plant-app-backend-h28h.onrender.com";
const REPLIT_URL =
  "https://b7add859-3cd7-4eed-a26d-922cd86fa3cd-00-ug3vo9n1i1we.pike.replit.dev";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function migrateUrls() {
  console.log("🔄 Starting URL migration from Render to Replit...");

  try {
    // Get all images from Supabase
    const { data: images, error: err } = await supabase
      .from("images")
      .select("*");

    if (err) {
      console.error("❌ Error fetching images:", err);
      return;
    }

    console.log(`📊 Found ${images.length} images to check`);

    let updatedCount = 0;
    for (const img of images) {
      if (img.firebase_url && img.firebase_url.includes(RENDER_URL)) {
        const newUrl = img.firebase_url.replace(RENDER_URL, REPLIT_URL);

        const { error: updateErr } = await supabase
          .from("images")
          .update({ firebase_url: newUrl })
          .eq("id", img.id);

        if (updateErr) {
          console.error(`❌ Error updating image ${img.id}:`, updateErr);
        } else {
          console.log(`✅ Updated image ${img.id}`);
          console.log(`   Old: ${img.firebase_url}`);
          console.log(`   New: ${newUrl}`);
          updatedCount++;
        }
      }
    }

    console.log(`\n✅ Migration complete! Updated ${updatedCount} images.`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

migrateUrls();
