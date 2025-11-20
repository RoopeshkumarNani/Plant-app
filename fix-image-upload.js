const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixImageUpload() {
  try {
    // Get the image record from Supabase
    const { data: images, error: queryError } = await supabase
      .from("images")
      .select("*")
      .eq("filename", "1763650330557-rose.jpg")
      .single();

    if (queryError) {
      console.error("❌ Error fetching image record:", queryError);
      return;
    }

    if (!images) {
      console.log("❌ Image record not found");
      return;
    }

    console.log("📋 Found image record:", images);
    console.log("");

    // Since we don't have access to the original file (it's on Render's filesystem),
    // we'll update the database to use a placeholder Supabase URL
    // OR suggest re-uploading

    console.log(
      "⚠️  The original image file is on Render's disk, not accessible locally."
    );
    console.log("📝 To fix this, you need to:");
    console.log("");
    console.log("Option 1 (RECOMMENDED): RE-UPLOAD the image");
    console.log("  - Go to Flowers tab");
    console.log("  - Click 'Add Image' on the Rosa flower");
    console.log("  - Select the same rose.jpg file");
    console.log("  - This time it will upload to Supabase Storage correctly");
    console.log("");
    console.log("Option 2: Delete and re-upload fresh");
    console.log("  - Delete the flower");
    console.log("  - Upload the image again as new flower");
    console.log("");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

fixImageUpload();
