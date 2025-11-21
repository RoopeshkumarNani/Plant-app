const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkData() {
  try {
    console.log("��� Checking Supabase tables...\n");
    
    // Check plants
    const { data: plants, error: plantError } = await supabase
      .from("plants")
      .select("id, species, nickname, images")
      .limit(3);
    
    if (plantError) {
      console.error("❌ Error querying plants:", plantError);
    } else {
      console.log(`✅ Plants found: ${plants?.length || 0}`);
      if (plants && plants.length > 0) {
        console.log("   Sample plant:", JSON.stringify(plants[0], null, 2).slice(0, 300));
      }
    }
    
    // Check flowers
    const { data: flowers, error: flowerError } = await supabase
      .from("flowers")
      .select("id, species, nickname, images")
      .limit(3);
    
    if (flowerError) {
      console.error("❌ Error querying flowers:", flowerError);
    } else {
      console.log(`\n✅ Flowers found: ${flowers?.length || 0}`);
      if (flowers && flowers.length > 0) {
        console.log("   Sample flower:", JSON.stringify(flowers[0], null, 2).slice(0, 300));
      }
    }
    
    // Check images
    const { data: images, error: imgError } = await supabase
      .from("images")
      .select("id, filename, firebase_url, supabase_url")
      .limit(3);
    
    if (imgError) {
      console.error("❌ Error querying images:", imgError);
    } else {
      console.log(`\n✅ Images found: ${images?.length || 0}`);
      if (images && images.length > 0) {
        console.log("   Sample image:", JSON.stringify(images[0], null, 2).slice(0, 300));
      }
    }
    
  } catch (e) {
    console.error("❌ Script error:", e.message);
  }
}

checkData();
