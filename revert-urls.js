#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const REPLIT_URL =
  "https://b7add859-3cd7-4eed-a26d-922cd86fa3cd-00-ug3vo9n1i1we.pike.replit.dev";
const RENDER_URL = "https://plant-app-backend-h28h.onrender.com";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function revertUrls() {
  try {
    console.log("🔄 Reverting image URLs back to Render...");

    const { data: images } = await supabase.from("images").select("*");

    let revertedCount = 0;
    for (const img of images) {
      if (img.firebase_url && img.firebase_url.includes(REPLIT_URL)) {
        const newUrl = img.firebase_url.replace(REPLIT_URL, RENDER_URL);
        await supabase
          .from("images")
          .update({ firebase_url: newUrl })
          .eq("id", img.id);
        console.log(`✅ Reverted image ${img.id}`);
        revertedCount++;
      }
    }

    console.log(`\n✅ Complete! Reverted ${revertedCount} images.`);
    console.log("Going forward, new uploads to Replit will use Replit URLs.");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

revertUrls();
