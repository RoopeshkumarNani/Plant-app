const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllFlowers() {
  try {
    console.log("🗑️  Fetching all flowers...");

    // Get all flowers
    const { data: flowers, error: fetchError } = await supabase
      .from("flowers")
      .select("id");

    if (fetchError) {
      console.error("❌ Error fetching flowers:", fetchError);
      return;
    }

    if (!flowers || flowers.length === 0) {
      console.log("✅ No flowers to delete - database is clean!");
      return;
    }

    console.log(`Found ${flowers.length} flower(s)\n`);

    for (const flower of flowers) {
      const flowerId = flower.id;
      console.log(`🗑️  Deleting flower: ${flowerId}`);

      // Delete conversations
      await supabase
        .from("conversations")
        .delete()
        .eq("flower_id", flowerId);

      // Delete images
      await supabase
        .from("images")
        .delete()
        .eq("flower_id", flowerId);

      // Delete flower
      await supabase
        .from("flowers")
        .delete()
        .eq("id", flowerId);

      console.log(`✅ Deleted!\n`);
    }

    console.log("🎉 All flowers deleted successfully!");
    console.log("");
    console.log("Now refresh your page and the frame will be gone!");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

deleteAllFlowers();
