/**
 * Migration script: Migrate data from db.json to Supabase
 * Run with: node migrate-to-supabase.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yvpoabomcnwegjvfwtav.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cG9hYm9tY253ZWdqdmZ3dGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTg0OTcsImV4cCI6MjA3ODgzNDQ5N30.uGZx7pysf0lwkBT7UeoWV0Hwg42BOz5QtKF_j6ec3EY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migrate() {
  try {
    console.log('📦 Starting migration from db.json to Supabase...\n');
    
    // Read db.json
    const dbPath = path.join(__dirname, 'data', 'db.json');
    if (!fs.existsSync(dbPath)) {
      console.error('❌ db.json not found at', dbPath);
      return;
    }
    
    const dbContent = fs.readFileSync(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    console.log(`✅ Loaded db.json with ${db.plants?.length || 0} plants and ${db.flowers?.length || 0} flowers\n`);
    
    // Migrate plants
    console.log('🌿 Migrating plants...');
    for (const plant of db.plants || []) {
      const { images, conversations, identification, profile, ...plantData } = plant;
      
      // Insert plant
      const { data: plantRow, error: plantError } = await supabase
        .from('plants')
        .insert({
          id: plant.id,
          species: plant.species,
          nickname: plant.nickname,
          owner: plant.owner || 'mother',
          adopted_date: profile?.adoptedDate,
          health_status: profile?.healthStatus || 'stable',
          care_score: profile?.careScore || 50,
          user_care_style: profile?.userCareStyle,
          preferred_light: profile?.preferredLight,
          watering_frequency: profile?.wateringFrequency
        });
      
      if (plantError) {
        console.warn(`  ⚠️  Error inserting plant ${plant.id}:`, plantError.message);
        continue;
      }
      
      // Migrate images for this plant
      for (const img of images || []) {
        const { data: imgRow, error: imgError } = await supabase
          .from('images')
          .insert({
            id: img.id,
            plant_id: plant.id,
            filename: img.filename,
            uploaded_at: img.uploadedAt,
            area: img.area,
            firebase_url: img.firebaseUrl
          });
        
        if (imgError) console.warn(`    ⚠️  Error inserting image ${img.id}:`, imgError.message);
      }
      
      // Migrate conversations for this plant
      for (const conv of conversations || []) {
        const { data: convRow, error: convError } = await supabase
          .from('conversations')
          .insert({
            id: conv.id,
            plant_id: plant.id,
            image_id: conv.imageId,
            role: conv.role,
            text: conv.text,
            text_en: conv.text_en,
            text_kn: conv.text_kn,
            time: conv.time,
            growth_delta: conv.growthDelta
          });
        
        if (convError) console.warn(`    ⚠️  Error inserting conversation ${conv.id}:`, convError.message);
      }
      
      console.log(`  ✅ Migrated plant: ${plant.nickname || plant.species} (${(images || []).length} images, ${(conversations || []).length} conversations)`);
    }
    
    // Migrate flowers
    console.log('\n🌸 Migrating flowers...');
    for (const flower of db.flowers || []) {
      const { images, conversations, identification, profile, ...flowerData } = flower;
      
      // Insert flower
      const { data: flowerRow, error: flowerError } = await supabase
        .from('flowers')
        .insert({
          id: flower.id,
          species: flower.species,
          nickname: flower.nickname,
          owner: flower.owner || 'mother',
          adopted_date: profile?.adoptedDate,
          health_status: profile?.healthStatus || 'stable',
          care_score: profile?.careScore || 50,
          user_care_style: profile?.userCareStyle,
          preferred_light: profile?.preferredLight,
          watering_frequency: profile?.wateringFrequency
        });
      
      if (flowerError) {
        console.warn(`  ⚠️  Error inserting flower ${flower.id}:`, flowerError.message);
        continue;
      }
      
      // Migrate images for this flower
      for (const img of images || []) {
        const { data: imgRow, error: imgError } = await supabase
          .from('images')
          .insert({
            id: img.id,
            flower_id: flower.id,
            filename: img.filename,
            uploaded_at: img.uploadedAt,
            area: img.area,
            firebase_url: img.firebaseUrl
          });
        
        if (imgError) console.warn(`    ⚠️  Error inserting image ${img.id}:`, imgError.message);
      }
      
      // Migrate conversations for this flower
      for (const conv of conversations || []) {
        const { data: convRow, error: convError } = await supabase
          .from('conversations')
          .insert({
            id: conv.id,
            flower_id: flower.id,
            image_id: conv.imageId,
            role: conv.role,
            text: conv.text,
            text_en: conv.text_en,
            text_kn: conv.text_kn,
            time: conv.time,
            growth_delta: conv.growthDelta
          });
        
        if (convError) console.warn(`    ⚠️  Error inserting conversation ${conv.id}:`, convError.message);
      }
      
      console.log(`  ✅ Migrated flower: ${flower.nickname || flower.species} (${(images || []).length} images, ${(conversations || []).length} conversations)`);
    }
    
    console.log('\n✅ Migration complete!');
    console.log('Next steps:');
    console.log('1. Update .env with SUPABASE_URL and SUPABASE_ANON_KEY');
    console.log('2. Update server.js to use Supabase client');
    console.log('3. Test the API endpoints');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
