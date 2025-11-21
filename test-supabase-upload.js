#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testUpload() {
  try {
    console.log("📤 Testing Supabase Storage upload...");

    // Create a simple test buffer (1KB of data)
    const testBuffer = Buffer.alloc(1024, "test data");

    const filename = `test-${Date.now()}.webp`;
    console.log(`   Uploading test file: ${filename}`);

    const { data, error } = await supabase.storage
      .from("images")
      .upload(filename, testBuffer, {
        contentType: "image/webp",
        upsert: false,
      });

    if (error) {
      console.error("❌ Upload failed:", error);
      console.error("   Status:", error.statusCode);
      console.error("   Message:", error.message);
      console.error("   Full error:", JSON.stringify(error));
      return;
    }

    console.log("✅ File uploaded! Response:", data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("images")
      .getPublicUrl(filename);

    console.log("✅ Public URL:", urlData.publicUrl);

    // List files
    const { data: files } = await supabase.storage.from("images").list();
    console.log("✅ Files in bucket:", files.length, "files");
  } catch (e) {
    console.error("❌ Exception:", e.message);
    console.error("   Stack:", e.stack);
  }

  process.exit(0);
}

testUpload();
