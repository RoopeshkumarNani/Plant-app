/**
 * Initialize sample plant data on Replit startup
 * This ensures data persists in ephemeral storage during the session
 * and provides test data if Supabase is empty
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function initializeData() {
  try {
    const dataDir = path.join(__dirname, 'data');
    const uploadDir = path.join(__dirname, 'uploads');
    const dbPath = path.join(dataDir, 'db.json');
    
    // Create directories if they don't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log("📁 Created data directory");
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log("📁 Created uploads directory");
    }
    
    // Check if db.json exists and has data
    let db = { plants: [], flowers: [] };
    if (fs.existsSync(dbPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (existing && (existing.plants?.length > 0 || existing.flowers?.length > 0)) {
          console.log("✅ Database already has data, skipping initialization");
          return;
        }
      } catch (e) {
        console.log("⚠️  Existing db.json is invalid, recreating...");
      }
    }
    
    // Create sample plants
    const plant1Id = uuidv4();
    const plant2Id = uuidv4();
    const img1Id = uuidv4();
    const img2Id = uuidv4();
    
    db.plants = [
      {
        id: plant1Id,
        subjectType: "plant",
        species: "Monstera Deliciosa",
        nickname: "Mona",
        location: "Living Room",
        images: [
          {
            id: img1Id,
            filename: "mona-1.webp",
            firebase_url: null,
            supabase_url: null,
            uploadedAt: new Date().toISOString(),
            area: null
          }
        ],
        conversations: [
          {
            id: uuidv4(),
            role: "plant",
            text: "Hi! I'm Mona, your beautiful Monstera. I'm loving this spot in the living room!",
            time: new Date().toISOString(),
            imageId: null,
            growthDelta: null
          }
        ],
        notes: "Sample test plant",
        lastUpdated: new Date().toISOString(),
        careFrequency: "weekly",
        wateringNeeds: "moderate"
      },
      {
        id: plant2Id,
        subjectType: "plant",
        species: "Pothos",
        nickname: "Peter",
        location: "Bedroom",
        images: [
          {
            id: img2Id,
            filename: "peter-1.webp",
            firebase_url: null,
            supabase_url: null,
            uploadedAt: new Date().toISOString(),
            area: null
          }
        ],
        conversations: [
          {
            id: uuidv4(),
            role: "plant",
            text: "I'm Peter the Pothos - I'm a hardy little climber and I'm doing great!",
            time: new Date().toISOString(),
            imageId: null,
            growthDelta: null
          }
        ],
        notes: "Sample test plant",
        lastUpdated: new Date().toISOString(),
        careFrequency: "weekly",
        wateringNeeds: "moderate"
      }
    ];
    
    db.flowers = [];
    
    // Save db.json
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log("✅ Sample database created");
    
    // Create test images using Sharp
    try {
      const sharp = require('sharp');
      
      // Green image for Mona
      const greenImage = await sharp({
        create: {
          width: 400,
          height: 400,
          channels: 3,
          background: { r: 34, g: 106, b: 79 }
        }
      })
      .webp({ quality: 80 })
      .toBuffer();
      
      fs.writeFileSync(path.join(uploadDir, 'mona-1.webp'), greenImage);
      console.log("✅ Created test image: mona-1.webp");
      
      // Light green image for Peter
      const lightGreenImage = await sharp({
        create: {
          width: 400,
          height: 400,
          channels: 3,
          background: { r: 122, g: 196, b: 136 }
        }
      })
      .webp({ quality: 80 })
      .toBuffer();
      
      fs.writeFileSync(path.join(uploadDir, 'peter-1.webp'), lightGreenImage);
      console.log("✅ Created test image: peter-1.webp");
      
    } catch (e) {
      console.warn("⚠️  Could not create test images:", e.message);
    }
    
    console.log("\n✅ Data initialization complete!");
    console.log("   Ready to test image uploading and display");
    
  } catch (e) {
    console.error("❌ Error during data initialization:", e.message);
    process.exit(1);
  }
}

// Run initialization
initializeData().catch(err => {
  console.error("❌ Initialization failed:", err);
  process.exit(1);
});
