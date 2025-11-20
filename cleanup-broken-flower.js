const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteFlower() {
  try {
    console.log(
      "🗑️  Deleting flower: Rosa × odorata (b707ab17-6b1e-47f8-8393-fb8a61bae2eb)"
    );

    const flowerId = "b707ab17-6b1e-47f8-8393-fb8a61bae2eb";

    // Delete conversations linked to this flower
    const { error: convError } = await supabase
      .from("conversations")
      .delete()
      .eq("flower_id", flowerId);

    if (convError)
      console.error("⚠️  Error deleting conversations:", convError);

    // Delete images linked to this flower
    const { error: imgError } = await supabase
      .from("images")
      .delete()
      .eq("flower_id", flowerId);

    if (imgError) console.error("⚠️  Error deleting images:", imgError);

    // Delete the flower
    const { error: flowerError } = await supabase
      .from("flowers")
      .delete()
      .eq("id", flowerId);

    if (flowerError) {
      console.error("❌ Error deleting flower:", flowerError);
      return;
    }

    console.log("✅ Flower deleted successfully!");
    console.log("");
    console.log("Now you can:");
    console.log("1. Go to my-soulmates.web.app");
    console.log("2. Click 'Flowers' tab");
    console.log("3. Click 'Upload Image'");
    console.log("4. Select your rose.jpg file");
    console.log("5. The image will upload properly to Supabase Storage");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

deleteFlower();
