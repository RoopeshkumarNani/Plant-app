const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Sample plant data with realistic image references
const samplePlants = [
  {
    id: uuidv4(),
    subjectType: "plant",
    species: "Monstera Deliciosa",
    nickname: "Mona",
    location: "Living Room",
    images: [
      {
        id: uuidv4(),
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
    id: uuidv4(),
    subjectType: "plant",
    species: "Pothos",
    nickname: "Peter",
    location: "Bedroom",
    images: [
      {
        id: uuidv4(),
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

const db = {
  plants: samplePlants,
  flowers: []
};

const dbPath = path.join(__dirname, 'data', 'db.json');
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log("‚úÖ Sample data created!");
console.log(`Ì≥ä Created ${samplePlants.length} sample plants`);
console.log("Ì≥ù Now you can upload real images to test the app");
console.log("\nÌ¥ç Database structure:");
console.log(JSON.stringify(db, null, 2).slice(0, 500) + "...");
