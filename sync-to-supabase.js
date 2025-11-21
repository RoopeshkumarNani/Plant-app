const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function syncData() {
  try {
    // Load local db.json
    const dbPath = path.join(__dirname, 'data', 'db.json');
    const localDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    console.log("��� Syncing data to Supabase...\n");
    
    // Upload plants - use only the columns that definitely exist
    console.log(`Uploading ${localDb.plants?.length || 0} plants...`);
    for (const plant of (localDb.plants || [])) {
      const { error } = await supabase
        .from('plants')
        .upsert({
          id: plant.id,
          species: plant.species,
          nickname: plant.nickname,
          location: plant.location || null,
          subject_type: plant.subjectType || 'plant'
        });
      
      if (error) {
        console.log(`  ❌ Error uploading plant ${plant.id}:`, error.message);
      } else {
        console.log(`  ✅ Uploaded plant: ${plant.nickname}`);
      }
    }
    
    // Upload images
    console.log(`\nUploading images...`);
    let imageCount = 0;
    for (const plant of (localDb.plants || [])) {
      for (const image of (plant.images || [])) {
        const { error } = await supabase
          .from('images')
          .upsert({
            id: image.id,
            plant_id: plant.id,
            filename: image.filename,
            firebase_url: image.firebase_url,
            supabase_url: image.supabase_url
          });
        
        if (error) {
          console.log(`  ❌ Error uploading image ${image.id}:`, error.message);
        } else {
          console.log(`  ✅ Uploaded image: ${image.filename}`);
          imageCount++;
        }
      }
    }
    
    console.log(`\n✅ Sync complete! ${imageCount} images uploaded`);
    
  } catch (e) {
    console.error("❌ Sync failed:", e.message);
  }
}

syncData();
