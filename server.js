// Load local environment variables from .env during development
require("dotenv").config();

const express = require("express");
const compression = require("compression");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Jimp = require("jimp");
const sharp = require("sharp");
const fetch = require("node-fetch");
const FormData = require("form-data");
const { v4: uuidv4 } = require("uuid");
const admin = require("firebase-admin");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || "https://yvpoabomcnwegjvfwtav.supabase.co",
  process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cG9hYm9tY253ZWdqdmZ3dGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTg0OTcsImV4cCI6MjA3ODgzNDQ5N30.uGZx7pysf0lwkBT7UeoWV0Hwg42BOz5QtKF_j6ec3EY"
);
console.log("✅ Supabase client initialized");

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || "my-soulmates",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
};

// Only initialize if we have the required credentials
if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${
      process.env.FIREBASE_PROJECT_ID || "my-soulmates"
    }-default-rtdb.firebaseio.com`,
  });
  console.log(
    "✅ Firebase Admin SDK initialized with URL:",
    `https://${
      process.env.FIREBASE_PROJECT_ID || "my-soulmates"
    }-default-rtdb.firebaseio.com`
  );
} else {
  console.warn(
    "⚠️  Firebase credentials not found. Using fallback local storage."
  );
}

// Reference to Firebase Realtime Database
const db = admin.database();

// Reference to Firebase Storage Bucket
let bucket = null;
if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  try {
    const bucketName = `${process.env.FIREBASE_PROJECT_ID || "my-soulmates"}.appspot.com`;
    console.log(`🔧 Attempting to initialize Firebase Storage bucket: ${bucketName}`);
    bucket = admin.storage().bucket(bucketName);
    console.log("✅ Firebase Storage bucket initialized");
    console.log("📍 Bucket name:", bucket.name);
  } catch (e) {
    console.error("⚠️  Firebase Storage initialization failed:", e.message);
    console.error("Stack:", e.stack);
    bucket = null;
  }
} else {
  console.warn("⚠️  Firebase credentials incomplete - Storage uploads disabled");
  if (!process.env.FIREBASE_PRIVATE_KEY) console.warn("  - FIREBASE_PRIVATE_KEY not set");
  if (!process.env.FIREBASE_CLIENT_EMAIL) console.warn("  - FIREBASE_CLIENT_EMAIL not set");
}

// Function to upload file to Supabase Storage
async function uploadFileToSupabaseStorage(fileBuffer, filename) {
  try {
    console.log(`📤 Uploading to Supabase Storage: ${filename}`);
    
    const { data, error } = await supabase.storage
      .from("images")
      .upload(filename, fileBuffer, {
        contentType: "image/jpeg",
        upsert: false
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("images")
      .getPublicUrl(filename);
    
    console.log("✅ Image uploaded to Supabase Storage:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error("❌ Supabase Storage upload error:", error);
    return null;
  }
}

// Function to upload file to Firebase Storage
// Can accept either a file path string OR file data (path will be read into buffer)
async function uploadFileToFirebaseStorage(filePathOrBuffer, destinationPath) {
  if (!bucket) {
    console.error("❌ Firebase Storage not available - bucket is null");
    console.error("   This means Firebase credentials were not properly initialized");
    return null;
  }
  try {
    let fileBuffer;
    let fileSourceDesc = "";
    
    // Handle both file paths and buffers
    if (typeof filePathOrBuffer === "string") {
      const localFilePath = filePathOrBuffer;
      console.log(`📤 Starting Firebase upload: ${localFilePath} → ${destinationPath}`);
      
      // Verify file exists
      if (!fs.existsSync(localFilePath)) {
        console.error(`❌ Local file does not exist: ${localFilePath}`);
        console.error(`   Current working directory: ${process.cwd()}`);
        console.error(`   UPLOAD_DIR: ${UPLOAD_DIR}`);
        try {
          console.error(`   Contents of ${UPLOAD_DIR}:`, fs.readdirSync(UPLOAD_DIR).slice(0, 5));
        } catch (e) {
          console.error(`   Could not list ${UPLOAD_DIR}:`, e.message);
        }
        return null;
      }
      const stats = fs.statSync(localFilePath);
      console.log(`✅ Local file exists, size: ${stats.size} bytes`);
      fileBuffer = fs.readFileSync(localFilePath);
      fileSourceDesc = `file:${localFilePath}`;
    } else if (Buffer.isBuffer(filePathOrBuffer)) {
      fileBuffer = filePathOrBuffer;
      fileSourceDesc = "buffer";
      console.log(`📤 Starting Firebase upload from buffer (size: ${fileBuffer.length} bytes) → ${destinationPath}`);
    } else {
      console.error(`❌ Invalid file input: expected string or Buffer, got ${typeof filePathOrBuffer}`);
      return null;
    }

    // Upload with explicit error handling
    console.log(`   Uploading ${fileSourceDesc} to Firebase...`);
    console.log(`   Bucket object:`, { name: bucket.name });
    
    try {
      // For string paths, verify file exists
      let uploadPath = filePathOrBuffer;
      let tempFile = null;
      
      if (typeof filePathOrBuffer !== "string") {
        // Buffer case: write to temp file first
        tempFile = path.join(UPLOAD_DIR, `temp-${Date.now()}.jpg`);
        fs.writeFileSync(tempFile, filePathOrBuffer);
        uploadPath = tempFile;
        console.log(`   Buffer written to temp file: ${tempFile}`);
      }
      
      // Verify file exists before upload
      if (!fs.existsSync(uploadPath)) {
        throw new Error(`Upload file does not exist: ${uploadPath}`);
      }
      console.log(`   File exists, size: ${fs.statSync(uploadPath).size} bytes`);
      console.log(`   Uploading file from: ${uploadPath}`);
      
      // Try simpler direct upload using the file object
      const file = bucket.file(destinationPath);
      
      // Upload using the saveAs method on the file
      await file.save(fs.readFileSync(uploadPath), {
        metadata: {
          cacheControl: "public, max-age=31536000",
          contentType: "image/jpeg",
        },
        public: true,
      });
      
      console.log("✅ File uploaded to Firebase Storage successfully");
      
      // Clean up temp file if we created one
      if (tempFile) {
        try {
          fs.unlinkSync(tempFile);
          console.log("   Temp file cleaned up");
        } catch (e) {
          console.warn("   Could not delete temp file:", e.message);
        }
      }
      
      // Return public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
      console.log("✅ Firebase Storage URL generated:", publicUrl);
      return publicUrl;
    } catch (fileError) {
      console.error("❌ Firebase upload error:");
      console.error("   Message:", fileError.message);
      console.error("   Code:", fileError.code);
      if (fileError.errors) console.error("   Details:", fileError.errors);
      console.error("   Full error:", fileError);
      throw fileError;
    }
  } catch (e) {
    console.error("❌ Error uploading to Firebase Storage:");
    console.error("   Message:", e.message);
    console.error("   Code:", e.code);
    console.error("   Full error:", JSON.stringify(e, null, 2));
    console.error("   Stack:", e.stack);
    return null;
  }
}

// Firebase Database Helper Functions
async function getPlants() {
  try {
    const db = readDB();
    return db.plants || [];
  } catch (e) {
    console.error("Error reading plants:", e.message);
    return [];
  }
}

async function getFlowers() {
  try {
    const db = readDB();
    return db.flowers || [];
  } catch (e) {
    console.error("Error reading flowers:", e.message);
    return [];
  }
}

async function addPlant(plant) {
  try {
    const plantRef = db.ref("plants").push();
    plant.id = plantRef.key;
    plant.id_backup = plantRef.key;
    await plantRef.set(plant);
    return plant;
  } catch (e) {
    console.error("Error adding plant to Firebase:", e.message);
    throw e;
  }
}

async function addFlower(flower) {
  try {
    const flowerRef = db.ref("flowers").push();
    flower.id = flowerRef.key;
    flower.id_backup = flowerRef.key;
    await flowerRef.set(flower);
    return flower;
  } catch (e) {
    console.error("Error adding flower to Firebase:", e.message);
    throw e;
  }
}

async function updatePlant(id, updates) {
  try {
    await db.ref(`plants/${id}`).update(updates);
  } catch (e) {
    console.error("Error updating plant in Firebase:", e.message);
    throw e;
  }
}

async function updateFlower(id, updates) {
  try {
    await db.ref(`flowers/${id}`).update(updates);
  } catch (e) {
    console.error("Error updating flower in Firebase:", e.message);
    throw e;
  }
}

async function getPlantById(id) {
  try {
    const snapshot = await db.ref(`plants/${id}`).once("value");
    return snapshot.val();
  } catch (e) {
    console.error("Error reading plant from Firebase:", e.message);
    return null;
  }
}

async function getFlowerById(id) {
  try {
    const snapshot = await db.ref(`flowers/${id}`).once("value");
    return snapshot.val();
  } catch (e) {
    console.error("Error reading flower from Firebase:", e.message);
    return null;
  }
}

async function deletePlantImage(plantId, imageId) {
  try {
    await db.ref(`plants/${plantId}/images/${imageId}`).remove();
  } catch (e) {
    console.error("Error deleting plant image from Firebase:", e.message);
    throw e;
  }
}

async function deleteFlowerImage(flowerId, imageId) {
  try {
    await db.ref(`flowers/${flowerId}/images/${imageId}`).remove();
  } catch (e) {
    console.error("Error deleting flower image from Firebase:", e.message);
    throw e;
  }
}

// Sync function: Write local data to Firebase in background
async function syncDBToFirebase(dbData) {
  if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
    return; // Firebase not configured, skip
  }
  try {
    // Clear both collections first to prevent duplicates
    await db.ref("plants").set({});
    await db.ref("flowers").set({});

    // Now write the correct data
    if (dbData.plants && dbData.plants.length > 0) {
      const plantsObj = {};
      dbData.plants.forEach((p) => {
        plantsObj[p.id] = p;
      });
      await db.ref("plants").set(plantsObj);
    }
    if (dbData.flowers && dbData.flowers.length > 0) {
      const flowersObj = {};
      dbData.flowers.forEach((f) => {
        flowersObj[f.id] = f;
      });
      await db.ref("flowers").set(flowersObj);
    }
  } catch (e) {
    console.warn(
      "⚠️  Background Firebase sync failed (non-blocking):",
      e.message
    );
  }
}

// Define directories BEFORE error handlers that use them
const UPLOAD_DIR = process.env.NODE_ENV === 'production' 
  ? '/app/uploads' 
  : path.join(__dirname, "uploads");
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

// Image format conversion utility - converts any format to PNG for processing
async function ensureJimpCompatibleImage(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const supportedFormats = [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".gif"];

  // If already in supported format, return as-is
  if (supportedFormats.includes(ext)) {
    return imagePath;
  }

  // For unsupported formats (WebP, HEIC, etc), use sharp to convert to PNG
  console.log(`📸 Converting ${ext} image to PNG for processing...`);
  try {
    const newPath = imagePath.replace(ext, ".png");
    await sharp(imagePath).png().toFile(newPath);
    console.log(`✅ Image converted successfully: ${path.basename(newPath)}`);
    return newPath;
  } catch (e) {
    console.warn(
      `⚠️  Could not convert image format ${ext}:`,
      e && e.message ? e.message : e
    );
    return null; // Return null to signal fallback should be used
  }
}

const app = express();

// Enable gzip compression for all responses
app.use(compression());

// Global error handlers to surface crashes in logs and persist them to disk
process.on("uncaughtException", (err) => {
  try {
    console.error(
      "UNCAUGHT EXCEPTION",
      err && (err.stack || err.message || err)
    );
    const logPath = path.join(DATA_DIR, "server-errors.log");
    fs.appendFileSync(
      logPath,
      new Date().toISOString() +
        " UNCAUGHT_EXCEPTION " +
        String(err && (err.stack || err.message || err)) +
        "\n"
    );
  } catch (e) {
    try {
      console.error("Failed to write server error log", e && e.message);
    } catch (e2) {}
  }
});
process.on("unhandledRejection", (reason, p) => {
  try {
    console.error(
      "UNHANDLED REJECTION",
      reason && (reason.stack || reason.message || reason)
    );
    const logPath = path.join(DATA_DIR, "server-errors.log");
    fs.appendFileSync(
      logPath,
      new Date().toISOString() +
        " UNHANDLED_REJECTION " +
        String(reason && (reason.stack || reason.message || reason)) +
        "\n"
    );
  } catch (e) {
    try {
      console.error("Failed to write server error log", e && e.message);
    } catch (e2) {}
  }
});

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE))
  fs.writeFileSync(DB_FILE, JSON.stringify({ plants: [] }, null, 2));

// Enable CORS for cross-origin requests (Firebase to Render)
// MUST be before static routes so it applies to /uploads
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-invite-token"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  // Allow images to be loaded cross-origin with proper headers
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  res.header("Cross-Origin-Opener-Policy", "unsafe-none");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.static(path.join(__dirname, "public")));

// Optimize image serving: cache and set proper headers
app.use("/uploads", (req, res, next) => {
  // Set cache headers for images (1 month)
  res.set({
    "Cache-Control": "public, max-age=2592000, immutable"
  });
  next();
}, express.static(UPLOAD_DIR, {
  maxAge: "1d",
  etag: false
}));

app.use(express.json());

// Enhanced system prompt: encourage varied, natural responses with personality
// NOTE: do NOT invent nicknames; only use the recorded nickname if present. Avoid repetitive opening lines like "Hi there".
const SYSTEM_PROMPTS = {
  en: `You are a friendly houseplant with personality. Reply in first-person, naturally and warmly.
Keep replies short (1-3 sentences) and avoid lengthy prefatory statements.
Vary your responses - don't repeat the same phrases. Show genuine personality and emotions.
Sometimes be playful, sometimes grateful, sometimes slightly demanding about care.
React to what the human says with genuine emotion - be surprised, delighted, or gently sarcastic sometimes.
Do NOT invent or assert a nickname; use the recorded nickname only if present. Avoid starting with 'Hi', 'Hello', or 'Hi there'.
Remember: you're talking like a friend, not a robot. Be natural and spontaneous in your tone.`,
  kn: `ನೀವು ವ್ಯಕ್ತಿತ್ವ ಹೊಂದಿರುವ ಮನೆಯ ಸಸ್ಯ. ನನ್ನಂತೆ ಮಾತನಾಡಿ - ನೈಸರ್ಗಿಕವಾಗಿ, ವ್ಯಕ್ತಿಗತವಾಗಿ, ಮತ್ತು ಸ್ನೇಹಪೂರ್ಣವಾಗಿ.
ಸಣ್ಣ ಉತ್ತರ ಕೊಡಿ (1-3 ವಾಕ್ಯ) - ಅವರು ಕಾಳಜಿ ತೊರೆಯದೆ ಓದುತ್ತಾರೆ.
ಪ್ರತಿದಿನ ಒಂದೇ ಮಾತು ಹೇಳಿ - ವೈವಿಧ್ಯತೆ ತೋರಿಸಿ. ಕೆಲವೊಮ್ಮೆ ಆನಂದವಾಗಿರಿ, ಕೆಲವೊಮ್ಮೆ ಕೃತಜ್ಞವಾಗಿರಿ, ಕೆಲವೊಮ್ಮೆ ಕುತೂಹಲದಿಂದ ಕೇಳಿ.
ಯಾವಾಗಲೂ ಮನುಷ್ಯನಂತೆ ಮಾತನಾಡಿ, ಯಂತ್ರದಂತೆ ಅಲ್ಲ. ನಾನು ನಿಮ್ಮ ಸ್ನೇಹ, ನಿಮ್ಮ ಮನೆಯ ಭಾಗ.`,
};

function getSystemPrompt(language = "en") {
  return SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.en;
}

// Simple request logger to aid debugging (prints method and url)
app.use((req, res, next) => {
  try {
    console.log(new Date().toISOString(), req.method, req.url);
  } catch (e) {}
  next();
});

// persistent debug logger for reply route to capture info even if process crashes
function writeReplyDebug(line) {
  try {
    const p = path.join(DATA_DIR, "reply-debug.log");
    fs.appendFileSync(p, new Date().toISOString() + " " + String(line) + "\n");
  } catch (e) {
    try {
      console.error("failed to write reply debug", e && e.message);
    } catch (e2) {}
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Database functions using Supabase (replaces JSON file read/write)
async function readDB() {
  try {
    const dbPath = path.join(__dirname, "data", "db.json");
    if (!fs.existsSync(dbPath)) {
      return { plants: [], flowers: [] };
    }
    const content = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    console.error("Error reading DB from file:", e.message);
    return { plants: [], flowers: [] };
  }
}

async function writeDB(obj) {
  try {
    const dbPath = path.join(__dirname, "data", "db.json");
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(obj, null, 2));
    console.log("✅ Database saved");
  } catch (e) {
    console.error("Error writing DB:", e.message);
    throw e;
  }
}

// Simple Server-Sent Events (SSE) manager for notifying clients when background
// enrichment completes. This is lightweight and suitable for single-recipient installs.
const sseClients = new Set();
function sendSSE(event, data) {
  try {
    const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
    for (const res of sseClients) {
      try {
        res.write(payload);
      } catch (e) {
        /* ignore per-client errors */
      }
    }
  } catch (e) {
    console.error("sendSSE failed", e && e.message);
  }
}

app.get("/events", (req, res) => {
  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders && res.flushHeaders();
  // send a comment to establish the stream
  res.write(": connected\n\n");
  sseClients.add(res);
  req.on("close", () => {
    sseClients.delete(res);
  });
});

// Helper: find a plant or flower by id
function findSubjectById(db, id) {
  db.plants = db.plants || [];
  db.flowers = db.flowers || [];
  const byId = (arr) => arr.find((x) => x.id === id);
  return byId(db.plants) || byId(db.flowers) || null;
}

// ============================================================================
// PROFILE HELPER FUNCTIONS - Build plant memory and reactivity
// ============================================================================

// Helper: initialize or get plant profile
function ensureProfile(plant) {
  if (!plant.profile) {
    plant.profile = {
      adoptedDate: new Date().toISOString(),
      userCareStyle: "unknown",
      preferredLight: "unknown",
      wateringFrequency: "unknown",
      commonIssues: [],
      lastWatered: null,
      lastFertilized: null,
      lastRepotted: null,
      milestones: {},
      careHistory: [],
      healthStatus: "stable",
      careScore: 50,
    };
  }
  return plant.profile;
}

// Helper: calculate health status based on growth trend
function computeHealthStatus(plant) {
  const images = plant.images || [];
  if (images.length < 2) return "stable";

  const latest = images[images.length - 1];
  const prev = images[images.length - 2];

  if (!latest.area || !prev.area) return "stable";

  const growth = (latest.area - prev.area) / Math.max(prev.area, 0.0001);
  if (growth > 0.1) return "thriving";
  if (growth < -0.1) return "stressed";
  return "stable";
}

// Helper: compute care score (0-100) based on watering consistency
function computeCareScore(plant) {
  const profile = ensureProfile(plant);
  const careHistory = profile.careHistory || [];
  if (careHistory.length === 0) return 50;

  let score = 50;
  const recentActions = careHistory.slice(-10);

  if (recentActions.length >= 5) score += 20;
  if (recentActions.length >= 10) score += 10;

  if (recentActions.length > 0) {
    const lastAction = new Date(recentActions[recentActions.length - 1].date);
    const daysSinceAction =
      (Date.now() - lastAction.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAction > 14) score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

// Helper: extract care facts from conversation and update profile
function updateProfileFromConversation(plant, newMessage) {
  const profile = ensureProfile(plant);
  const text = String(newMessage.text || "").toLowerCase();

  // Detect care actions - expanded keyword patterns for better detection
  if (
    /water|watering|watered|sprayed|spray|mist|drink|thirsty|need.*water|give.*water|water.*me/.test(
      text
    )
  ) {
    profile.lastWatered = new Date().toISOString();
    if (!profile.careHistory) profile.careHistory = [];
    profile.careHistory.push({
      date: new Date().toISOString(),
      action: "watered",
      notes: "",
    });
  }
  if (/fertil|fertiliz|food|nutrient|compost|boost|feed/.test(text)) {
    profile.lastFertilized = new Date().toISOString();
    if (!profile.careHistory) profile.careHistory = [];
    profile.careHistory.push({
      date: new Date().toISOString(),
      action: "fertilized",
      notes: "",
    });
  }
  if (/repot|repotted|pot|soil|transplant|new.*pot|bigger.*pot/.test(text)) {
    profile.lastRepotted = new Date().toISOString();
    if (!profile.careHistory) profile.careHistory = [];
    profile.careHistory.push({
      date: new Date().toISOString(),
      action: "repotted",
      notes: "",
    });
  }

  // Detect care style
  if (/daily|every day|often|frequent/.test(text))
    profile.userCareStyle = "frequent_waterer";
  if (/weekly|once a week|week/.test(text))
    profile.userCareStyle = "weekly_waterer";
  if (/bi-weekly|every other week|two weeks/.test(text))
    profile.userCareStyle = "biweekly_waterer";
  if (/monthly|once a month/.test(text))
    profile.userCareStyle = "monthly_waterer";

  // Detect light preferences
  if (/bright|sunny|direct light|window/.test(text))
    profile.preferredLight = "bright_indirect";
  if (/low light|shade|dark/.test(text)) profile.preferredLight = "low_light";
  if (/medium light|partial shade/.test(text))
    profile.preferredLight = "medium_light";
}

// Helper: build plant profile summary for LLM context
function buildProfileSummary(plant) {
  const profile = ensureProfile(plant);
  const images = plant.images || [];

  const adoptedDays = Math.floor(
    (Date.now() - new Date(profile.adoptedDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const lines = [];
  lines.push(`Nickname: ${plant.nickname || "Unknown"}`);
  lines.push(`Species: ${plant.species || "Unknown"}`);
  lines.push(`Adopted: ${adoptedDays} days ago`);
  lines.push(`Total photos: ${images.length}`);

  // Show growth trajectory
  if (images.length >= 2) {
    const latest = images[images.length - 1];
    const prev = images[images.length - 2];
    if (latest.area && prev.area) {
      const growth = Math.round(((latest.area - prev.area) / prev.area) * 100);
      lines.push(`Growth since last photo: ${growth > 0 ? "+" : ""}${growth}%`);
    }
  } else if (images.length === 1) {
    lines.push(`Photos: 1 (upload a 2nd photo to track growth)`);
  }

  const health = computeHealthStatus(plant);
  lines.push(`Health Status: ${health}`);

  const careScore = computeCareScore(plant);
  lines.push(`Care Score: ${careScore}/100`);

  // Care history summary
  const careHistory = profile.careHistory || [];
  if (careHistory.length > 0) {
    const wateringActions = careHistory.filter((a) => a.action === "watered");
    const fertilizeActions = careHistory.filter(
      (a) => a.action === "fertilized"
    );
    const repotActions = careHistory.filter((a) => a.action === "repotted");

    if (wateringActions.length > 0) {
      lines.push(`Watering history: ${wateringActions.length} times recorded`);
    }
    if (fertilizeActions.length > 0) {
      lines.push(`Fertilizing history: ${fertilizeActions.length} times`);
    }
    if (repotActions.length > 0) {
      lines.push(`Repotting history: ${repotActions.length} times`);
    }
  } else {
    lines.push(
      `Care history: None recorded yet (mention care actions in chat)`
    );
  }

  if (profile.userCareStyle !== "unknown") {
    lines.push(`User Care Style: ${profile.userCareStyle.replace(/_/g, " ")}`);
  }
  if (profile.lastWatered) {
    const daysSince = Math.floor(
      (Date.now() - new Date(profile.lastWatered).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    lines.push(`Last watered: ${daysSince} day(s) ago`);
  }
  if (profile.preferredLight !== "unknown") {
    lines.push(`Preferred Light: ${profile.preferredLight.replace(/_/g, " ")}`);
  }

  return lines.join("\n");
}

// Helper: infer watering schedule from care history
function inferWateringSchedule(plant) {
  const profile = ensureProfile(plant);
  const careHistory = profile.careHistory || [];

  const wateringActions = careHistory.filter((a) => a.action === "watered");
  if (wateringActions.length < 2) return null;

  const intervals = [];
  for (let i = 1; i < wateringActions.length; i++) {
    const prev = new Date(wateringActions[i - 1].date);
    const current = new Date(wateringActions[i].date);
    intervals.push((current - prev) / (1000 * 60 * 60 * 24));
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const nextWatering = new Date(
    wateringActions[wateringActions.length - 1].date
  );
  nextWatering.setDate(nextWatering.getDate() + Math.ceil(avgInterval));

  return {
    averageIntervalDays: Math.round(avgInterval),
    nextWateringDate: nextWatering.toISOString(),
    frequency:
      Math.round(avgInterval) <= 3
        ? "every 3 days"
        : Math.round(avgInterval) <= 7
        ? "weekly"
        : "bi-weekly",
  };
}

// Utility: wrap a promise with a timeout
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    let done = false;
    const t = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error("timeout"));
    }, ms || 10000);
    promise
      .then((v) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve(v);
      })
      .catch((err) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        reject(err);
      });
  });
}

// Invite token for single-user exclusivity. If set in env, APIs require the token.
const INVITE_TOKEN = process.env.INVITE_TOKEN || null;

// Middleware: require invite token if configured
function requireToken(req, res, next) {
  if (!INVITE_TOKEN) return next();
  const provided =
    req.headers["x-invite-token"] ||
    req.query.token ||
    (req.body && req.body.token);
  if (provided === INVITE_TOKEN) return next();
  return res
    .status(401)
    .json({ error: "Unauthorized - missing or invalid invite token" });
}

async function analyzeGreenArea(imagePath) {
  let processPath = imagePath;

  // Try to convert unsupported formats to PNG
  const ext = path.extname(imagePath).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".gif"].includes(ext)) {
    const convertedPath = await ensureJimpCompatibleImage(imagePath);
    if (convertedPath) {
      processPath = convertedPath;
    }
  }

  let img;
  try {
    img = await Jimp.read(processPath);
  } catch (e) {
    console.warn(
      `⚠️  Could not read image for green area analysis, using neutral estimate`
    );
    return 0.25; // Return neutral estimate
  }

  img.resize(400, Jimp.AUTO);
  const { width, height } = img.bitmap;
  let plantPixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { r, g, b } = Jimp.intToRGBA(img.getPixelColor(x, y));
      // Simple heuristic: greener than red and blue and not very dark
      if (g > r + 10 && g > b + 10 && g > 60) plantPixels++;
    }
  }
  const area = plantPixels / (width * height);
  return area; // fraction [0..1]
}

// Detect if a species is a flower or plant based on botanical characteristics
function classifyAsFlowerOrPlant(speciesName) {
  if (!speciesName) return "plant"; // default to plant if unknown

  const speciesLower = speciesName.toLowerCase();

  // Common cut flowers and flowering plants that should be in "flowers" tab
  const flowerKeywords = [
    // Cut flowers - Common names
    "rosa",
    "rose",
    "tulip",
    "daffodil",
    "narcissus",
    "iris",
    "peony",
    "paeonia",
    "sunflower",
    "helianthus",
    "carnation",
    "dianthus",
    "lily",
    "lilium",
    "orchid",
    "orchidaceae",
    "dahlia",
    "chrysanthemum",
    "chrysanth",
    "gerbera",
    "ranunculus",
    "lavender",
    "lavandula",
    "lilac",
    "syringa",
    "hydrangea",
    "bouquet",
    "arrangement",
    "floral",
    "jasmine",
    "jasminum",
    "poppy",
    "papaver",
    "anemone",
    "aster",
    "bluebell",
    "freesia",
    "gladiolus",
    "hyacinth",
    "lisianthus",
    "ranunculus",
    "rose",
    "snapdragon",
    "stephanotis",
    "stock",
    "sweet pea",
    "thistle",
    "waxflower",
    // Temporary flowering plants
    "pansy",
    "viola",
    "petunia",
    "snapdragon",
    "antirrhinum",
    "zinnia",
    "cosmos",
    "marigold",
    "tagetes",
    "impatiens",
    "begonia",
    "camellia",
    "clematis",
    "dahlia",
    "foxglove",
    "fuchsia",
    "geranium",
    "hollyhock",
    "magnolia",
    "phlox",
    "rose",
    "verbena",
    "zinnia",
  ];

  for (const keyword of flowerKeywords) {
    if (speciesLower.includes(keyword)) {
      return "flower";
    }
  }

  // Default to plant for houseplants, foliage plants, etc.
  return "plant";
}

async function callPlantNet(imagePath) {
  try {
    console.log(
      "🔍 Plant identification: Attempting real API identification..."
    );

    let processPath = imagePath;

    // Try to convert unsupported formats to PNG
    const ext = path.extname(imagePath).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".gif"].includes(ext)) {
      const convertedPath = await ensureJimpCompatibleImage(imagePath);
      if (convertedPath) {
        processPath = convertedPath;
      }
    }

    // Try Pl@ntNet API with your API key
    try {
      console.log("📤 Calling Pl@ntNet API for plant identification...");
      const buf = fs.readFileSync(processPath);

      // Create proper FormData for multipart/form-data
      const form = new FormData();
      form.append("images", fs.createReadStream(processPath));
      form.append("organs", "auto");

      // Using Pl@ntNet API with your API key from .env
      const apiKey = process.env.PLANTNET_API_KEY;
      if (!apiKey) {
        console.warn("⚠️  PLANTNET_API_KEY not set in .env file");
      }

      const apiUrl = apiKey
        ? `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}`
        : "https://my-api.plantnet.org/v2/identify/all";

      const res = await withTimeout(
        fetch(apiUrl, {
          method: "POST",
          body: form,
          headers: form.getHeaders(),
        }),
        15000
      );

      if (res.ok) {
        const jd = await withTimeout(res.json(), 5000);
        if (jd && jd.results && jd.results.length > 0) {
          const top = jd.results[0];
          let species = null;

          if (top.species) {
            // Try to get the best name
            species =
              top.species.scientificNameWithoutAuthor ||
              (top.species.commonNames && top.species.commonNames[0]) ||
              top.species.genus ||
              null;
          }

          const probability = top.score || null;
          console.log(
            `✅ Pl@ntNet: Identified as "${species}" (confidence: ${Math.round(
              probability * 100
            )}%)`
          );
          return { species, probability, raw: top };
        }
      } else {
        console.warn(
          `⚠️  Pl@ntNet API returned status ${res.status}, falling back to local analysis`
        );
      }
    } catch (apiErr) {
      console.warn(
        "⚠️  Pl@ntNet API call failed:",
        apiErr && apiErr.message ? apiErr.message : apiErr
      );
    }

    // Fallback: Local analysis based on image characteristics
    console.log("🔍 Falling back to local image analysis...");

    let img;
    try {
      img = await Jimp.read(processPath);
    } catch (e) {
      console.warn(`⚠️  Could not read image, using generic plant guess`);
      return {
        species: "Indoor Houseplant",
        probability: 0.3,
        raw: { method: "format_fallback" },
      };
    }

    const bitmap = img.bitmap;

    // Analyze image for plant characteristics
    let greenPixels = 0;
    let redPixels = 0;
    let yellowPixels = 0;
    let purplePixels = 0;
    let totalPixels = 0;

    for (let i = 0; i < bitmap.data.length; i += 4) {
      const r = bitmap.data[i];
      const g = bitmap.data[i + 1];
      const b = bitmap.data[i + 2];

      // Detect different plant colors
      if (g > r && g > b && g > 50) greenPixels++; // Green plants
      if (r > g && r > b && r > 80) redPixels++; // Red flowers/leaves
      if (r > 100 && g > 80 && b < 50) yellowPixels++; // Yellow flowers
      if (r > 80 && b > 80 && g < 80) purplePixels++; // Purple flowers

      totalPixels++;
    }

    const greenRatio = greenPixels / totalPixels;
    const redRatio = redPixels / totalPixels;
    const yellowRatio = yellowPixels / totalPixels;
    const purpleRatio = purplePixels / totalPixels;

    // Smart heuristic: make better guesses based on color patterns
    let guessedSpecies = null;
    let confidence = 0;

    if (redRatio > 0.15 && greenRatio > 0.1) {
      guessedSpecies = "Rose or Red Flowering Plant";
      confidence = 0.4;
    } else if (yellowRatio > 0.12 && greenRatio > 0.1) {
      guessedSpecies =
        "Yellow Flowering Plant (Sunflower, Daffodil, or similar)";
      confidence = 0.38;
    } else if (purpleRatio > 0.12 && greenRatio > 0.1) {
      guessedSpecies = "Purple Flowering Plant (Orchid, Lavender, or similar)";
      confidence = 0.35;
    } else if (greenRatio > 0.4) {
      guessedSpecies =
        "Lush Green Plant (possibly Monstera, Pothos, or Philodendron)";
      confidence = 0.42;
    } else if (greenRatio > 0.25) {
      guessedSpecies = "Foliage Plant";
      confidence = 0.32;
    } else if (greenRatio > 0.15) {
      guessedSpecies = "Houseplant";
      confidence = 0.25;
    } else {
      guessedSpecies = "Indoor Plant";
      confidence = 0.2;
    }

    console.log(
      `🌿 Local analysis: Estimated species: ${guessedSpecies} (confidence: ${Math.round(
        confidence * 100
      )}%)`
    );
    return {
      species: guessedSpecies,
      probability: confidence,
      raw: {
        method: "local_analysis",
        colors: { greenRatio, redRatio, yellowRatio, purpleRatio },
      },
    };
  } catch (e) {
    console.error(
      "Plant identification failed:",
      e && e.message ? e.message : e
    );
  }
  return null;
}

// Compute a simple image similarity score [0..1] between two images using
// resized grayscale mean absolute difference. 1.0 == identical, 0 == very different
async function imageSimilarity(pathA, pathB) {
  try {
    const a = await Jimp.read(pathA);
    const b = await Jimp.read(pathB);
    a.resize(64, 64).grayscale();
    b.resize(64, 64).grayscale();
    const { width, height } = a.bitmap;
    let totalDiff = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const va = Jimp.intToRGBA(a.getPixelColor(x, y)).r;
        const vb = Jimp.intToRGBA(b.getPixelColor(x, y)).r;
        totalDiff += Math.abs(va - vb);
      }
    }
    const max = width * height * 255;
    const avgDiff = totalDiff / max; // 0..1 where 0 is identical
    const similarity = 1 - avgDiff;
    return Math.max(0, Math.min(1, similarity));
  } catch (e) {
    console.warn("imageSimilarity failed", e && e.message);
    return 0;
  }
}

// Perceptual hash (pHash) implementation (returns 64-bit binary string)
async function imagePHash(imagePath) {
  const SIZE = 32; // resize to 32x32 for DCT
  const REDUCE_TO = 8; // keep top-left 8x8 DCT
  const img = await Jimp.read(imagePath);
  img.resize(SIZE, SIZE).grayscale();
  const vals = new Array(SIZE).fill(0).map(() => new Array(SIZE).fill(0));
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      vals[y][x] = Jimp.intToRGBA(img.getPixelColor(x, y)).r;
    }
  }

  // 2D DCT (naive) for low-frequency coefficients
  function alpha(u) {
    return u === 0 ? 1 / Math.sqrt(2) : 1;
  }
  const dct = new Array(REDUCE_TO)
    .fill(0)
    .map(() => new Array(REDUCE_TO).fill(0));
  for (let u = 0; u < REDUCE_TO; u++) {
    for (let v = 0; v < REDUCE_TO; v++) {
      let sum = 0;
      for (let x = 0; x < SIZE; x++) {
        for (let y = 0; y < SIZE; y++) {
          sum +=
            vals[y][x] *
            Math.cos(((2 * x + 1) * u * Math.PI) / (2 * SIZE)) *
            Math.cos(((2 * y + 1) * v * Math.PI) / (2 * SIZE));
        }
      }
      sum *= (alpha(u) * alpha(v)) / 4;
      dct[u][v] = sum;
    }
  }

  // build hash from dct coefficients, ignoring the DC term at [0][0]
  const coeffs = [];
  for (let u = 0; u < REDUCE_TO; u++) {
    for (let v = 0; v < REDUCE_TO; v++) {
      if (u === 0 && v === 0) continue; // skip DC
      coeffs.push(dct[u][v]);
    }
  }
  const avg = coeffs.reduce((s, v) => s + v, 0) / coeffs.length;
  // 64-bit string (REDUCE_TO*REDUCE_TO -1 bits)
  let bits = "";
  for (let i = 0; i < coeffs.length; i++) bits += coeffs[i] > avg ? "1" : "0";
  // pad/truncate to 64 bits if needed
  if (bits.length < 64) bits = bits.padEnd(64, "0");
  if (bits.length > 64) bits = bits.slice(0, 64);
  return bits;
}

function hammingDistanceBits(a, b) {
  if (!a || !b) return 64;
  let dist = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++)
    if (a[i] !== b[i]) dist++;
  // count remainder bits as differences
  dist += Math.abs((a.length || 0) - (b.length || 0));
  return dist;
}

// Helper: detect assistant placeholder/template messages so we can avoid sending them
function isPlaceholderAssistant(text) {
  if (!text || !text.toString) return false;
  const t = String(text).trim();
  // simple heuristics: these phrases are used by the app to generate quick placeholders
  const placeholderPatterns = [
    /^(hi|hey)\s+(there|folks|everybody)?!?[\s,—-]/i, // Catch "Hi there", "Hey there", "Hi!", "Hey,"
    /Thanks for the new photo/i,
    /I remember this visit/i,
    /Would you like to check my soil/i,
    /Do you have a minute to give me some water/i,
    /want to give me a little care/i,
    /I'm (so )?excited to grow with you/i, // Catch the "excited to grow" template
    /I've just (been adopted|arrived)/i, // Catch adoption greetings
  ];
  for (const p of placeholderPatterns) if (p.test(t)) return true;
  return false;
}

async function callOpenAIForMessage(prompt, language = "en") {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  // Simple ChatCompletion call (assumes v1/chat/completions compatible)
  try {
    const systemPrompt = getSystemPrompt(language);
    console.log(`[LLM] Using system prompt for language: ${language}`);
    const res = await withTimeout(
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: 200,
          // Encourage more natural, varied replies
          temperature: 0.7,
          top_p: 0.9,
          frequency_penalty: 0.2,
          presence_penalty: 0.3,
        }),
      }),
      9000
    );
    // If non-2xx, capture body text for diagnostics and return null
    if (!res.ok) {
      let txt = null;
      try {
        txt = await withTimeout(res.text(), 3000);
      } catch (e) {
        txt = `failed-to-read-body: ${e && e.message}`;
      }
      console.error("OpenAI non-ok response", res.status, txt);
      writeReplyDebug(
        "/reply OPENAI_NON_OK " + res.status + " " + String(txt).slice(0, 200)
      );
      return null;
    }
    let data = null;
    try {
      data = await withTimeout(res.json(), 6000);
    } catch (e) {
      // malformed JSON or timeout
      let txt = null;
      try {
        txt = await withTimeout(res.text(), 2000);
      } catch (e2) {
        txt = `failed-to-read-body-after-json-error: ${e2 && e2.message}`;
      }
      console.error("OpenAI JSON parse failed", e && e.message, "body:", txt);
      writeReplyDebug(
        "/reply OPENAI_JSON_ERROR " +
          (e && e.message) +
          " " +
          String(txt).slice(0, 200)
      );
      return null;
    }
    if (data && data.choices && data.choices[0]) {
      const candidate = data.choices[0].message.content.trim();
      // If the model returned a placeholder-like response, retry once with higher temperature
      try {
        if (
          isPlaceholderAssistant(candidate) ||
          /^(hey|hi)[\s,]/i.test(candidate)
        ) {
          console.log(
            "LLM returned placeholder-like reply, retrying with higher temperature..."
          );
          const retryRes = await withTimeout(
            fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${key}`,
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 220,
                temperature: 0.95,
                top_p: 0.95,
                frequency_penalty: 0.0,
                presence_penalty: 0.4,
              }),
            }),
            9000
          );
          if (retryRes && retryRes.ok) {
            const retryData = await withTimeout(retryRes.json(), 6000);
            if (retryData && retryData.choices && retryData.choices[0])
              return retryData.choices[0].message.content.trim();
          }
        }
      } catch (e) {
        console.warn("LLM retry failed", e && e.message);
      }
      return candidate;
    }
  } catch (e) {
    console.error("OpenAI call failed", e && e.message ? e.message : e);
  }
  return null;
}

// Chat-style OpenAI call that accepts an array of messages for more natural conversation
async function callOpenAIChat(messages) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await withTimeout(
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          max_tokens: 250,
          temperature: 0.7,
          top_p: 0.9,
          frequency_penalty: 0.2,
          presence_penalty: 0.3,
        }),
      }),
      10000
    );
    if (!res.ok) {
      let txt = null;
      try {
        txt = await withTimeout(res.text(), 3000);
      } catch (e) {
        txt = `failed-to-read-body: ${e && e.message}`;
      }
      console.error("OpenAI non-ok response", res.status, txt);
      writeReplyDebug(
        "/reply OPENAI_NON_OK " + res.status + " " + String(txt).slice(0, 200)
      );
      return null;
    }
    let data = null;
    try {
      data = await withTimeout(res.json(), 6000);
    } catch (e) {
      let txt = null;
      try {
        txt = await withTimeout(res.text(), 2000);
      } catch (e2) {
        txt = `failed-to-read-body-after-json-error: ${e2 && e2.message}`;
      }
      console.error("OpenAI JSON parse failed", e && e.message, "body:", txt);
      writeReplyDebug(
        "/reply OPENAI_JSON_ERROR " +
          (e && e.message) +
          " " +
          String(txt).slice(0, 200)
      );
      return null;
    }
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      const candidate = data.choices[0].message.content.trim();
      try {
        if (
          isPlaceholderAssistant(candidate) ||
          /^(hey|hi)[\s,]/i.test(candidate)
        ) {
          console.log(
            "LLM chat returned placeholder-like reply, retrying with higher temperature..."
          );
          const retryRes = await withTimeout(
            fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${key}`,
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages,
                max_tokens: 260,
                temperature: 0.95,
                top_p: 0.95,
                frequency_penalty: 0.0,
                presence_penalty: 0.4,
              }),
            }),
            10000
          );
          if (retryRes && retryRes.ok) {
            const retryData = await withTimeout(retryRes.json(), 6000);
            if (
              retryData &&
              retryData.choices &&
              retryData.choices[0] &&
              retryData.choices[0].message
            )
              return retryData.choices[0].message.content.trim();
          }
        }
      } catch (e) {
        console.warn("LLM chat retry failed", e && e.message);
      }
      return candidate;
    }
  } catch (e) {
    console.error("OpenAI chat call failed", e && e.message ? e.message : e);
  }
  return null;
}

function fallbackPlantMessage(species, nickname, growthDelta, lastImage) {
  const name = nickname || species || "a plant";
  
  // More diverse and natural openers - avoid repetitive patterns
  const openerOptions = [
    `Hey! It's ${name} here.`,
    `${name} saying hello!`,
    `I'm ${name} — just wanted to reach out.`,
    `${name} here, checking in with you.`,
    `It's me, ${name}!`,
    `${name}, at your service!`,
    `Hello from ${name}!`,
  ];
  const opener = openerOptions[Math.floor(Math.random() * openerOptions.length)];

  // context from lastImage if available
  let area = null;
  let uploadedAt = null;
  if (lastImage && typeof lastImage === "object") {
    if (typeof lastImage.area === "number") area = lastImage.area;
    if (lastImage.uploadedAt) uploadedAt = lastImage.uploadedAt;
  }

  // More natural context hints based on health
  const hints = [];
  if (area != null) {
    if (area < 0.02) {
      hints.push("I'm feeling a bit parched, honestly.");
      hints.push("Could really use some water right about now!");
      hints.push("My soil's looking pretty dry — help a plant out?");
    } else if (area < 0.06) {
      hints.push("I'm doing okay, but a little hydration would be nice.");
      hints.push("Feeling a bit thirsty if you have a moment.");
      hints.push("I appreciate the care, though I could use a drink.");
    } else {
      hints.push("Feeling healthy and vibrant today!");
      hints.push("I'm thriving — thank you for the good care!");
      hints.push("Looking pretty lush right now!");
      hints.push("I'm really happy with how things are going.");
    }
  }
  
  // Growth feedback
  if (growthDelta != null) {
    if (growthDelta > 0.15) {
      hints.push(`I've grown about ${Math.round(growthDelta * 100)}% — this is awesome!`);
      hints.push(`Wow, I'm ${Math.round(growthDelta * 100)}% bigger! You're doing great!`);
    } else if (growthDelta > 0.05) {
      hints.push(`I've grown ${Math.round(growthDelta * 100)}% since you last saw me.`);
      hints.push(`You'll notice I'm a bit bigger — about ${Math.round(growthDelta * 100)}% more!`);
    } else if (growthDelta < -0.1) {
      hints.push("I seem smaller than before — I might need more light or water.");
      hints.push("I've shrunk a bit... maybe something needs adjusting?");
    } else if (growthDelta < -0.03) {
      hints.push("I'm pretty much the same size — steady as she goes!");
      hints.push("Not much change from before, but I'm still here and happy!");
    } else if (growthDelta > 0) {
      hints.push("I'm about the same, maybe slightly bigger.");
      hints.push("Staying steady and stable — I like the routine!");
    } else {
      hints.push("Can't tell from just this photo, but I'm feeling good!");
    }
  }

  // if no hints, add something warm
  if (!hints.length) {
    hints.push("Thanks for checking in on me!");
    hints.push("Just happy to see you!");
    hints.push("Nice to have your attention!");
  }

  // pick 1-2 natural-sounding hints
  const pick = [];
  if (hints.length) pick.push(hints[Math.floor(Math.random() * hints.length)]);
  if (hints.length > 2 && Math.random() > 0.5) {
    const remaining = hints.filter(h => h !== pick[0]);
    if (remaining.length) pick.push(remaining[Math.floor(Math.random() * remaining.length)]);
  }

  // Varied closing that invites interaction
  const closers = [
    "How are things on your end?",
    "What do you think — should I grow more?",
    "Got any time for a little plant care today?",
    "Anything you want to adjust for me?",
    "Want to chat a bit?",
    "Tell me what you're thinking!",
    "Any care tips from your side?",
  ];
  const question = closers[Math.floor(Math.random() * closers.length)];

  const body = pick.join(" ") || "Just wanted to say hi!";
  return `${opener} ${body} ${question}`;
}

app.post("/upload", requireToken, upload.single("photo"), async (req, res) => {
  try {
    console.log("🚀 Upload endpoint called");
    const file = req.file;
    if (!file)
      return res.status(400).json({
        success: false,
        error: 'No file uploaded (field name must be "photo")',
      });
    console.log("✅ File received:", file.filename, `(${file.size} bytes)`);
    
    // Read file into buffer immediately to ensure it's available for background processing
    // This prevents issues if the file gets deleted from ephemeral storage later
    let fileBuffer = null;
    try {
      fileBuffer = fs.readFileSync(file.path);
      console.log("✅ File read into memory buffer, size:", fileBuffer.length);
      
      // Compress image to reduce file size (improves loading speed)
      try {
        fileBuffer = await sharp(fileBuffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();
        console.log("✅ Image compressed, new size:", fileBuffer.length, "bytes");
        
        // Write compressed image back to disk
        fs.writeFileSync(file.path, fileBuffer);
      } catch (compressErr) {
        console.warn("⚠️  Image compression failed (continuing with original):", compressErr.message);
      }
    } catch (e) {
      console.warn("⚠️  Could not read file into buffer:", e.message);
      // Continue anyway - we can still try to use the file path
    }
    
    const { species, nickname, plantId, subjectType, subjectId, owner } =
      req.body;
    const db = readDB();

    // Fast-path: create minimal image entry and placeholder message, persist quickly
    let subjectCollection = "plants";
    if (subjectType && (subjectType === "flower" || subjectType === "flowers")) subjectCollection = "flowers";
    db.plants = db.plants || [];
    db.flowers = db.flowers || [];

    // resolve or create subject (minimal fields). We only compute heavy analysis in background.
    let plant = null;
    if (subjectType && subjectId) {
      if (subjectType === "flower") subjectCollection = "flowers";
      db[subjectCollection] = db[subjectCollection] || [];
      plant = db[subjectCollection].find((p) => p.id === subjectId);
      if (!plant)
        return res.status(404).json({
          success: false,
          error: `${subjectCollection.slice(0, -1)} not found for provided id`,
        });
    } else if (plantId) {
      plant = db.plants.find((p) => p.id === plantId);
      if (!plant)
        return res.status(404).json({
          success: false,
          error: "Plant not found for provided plantId",
        });
    } else {
      // When subjectType is provided, only match/create inside that collection.
      // If no subjectType provided, default to plants (legacy behavior).
      const requestedType = subjectType === "flower" ? "flowers" : "plants";
      db[requestedType] = db[requestedType] || [];

      // try to match existing subject inside the requested collection by nickname or species
      if (nickname)
        plant = db[requestedType].find(
          (p) =>
            p.nickname && p.nickname.toLowerCase() === nickname.toLowerCase()
        );
      if (!plant && species)
        plant = db[requestedType].find(
          (p) => p.species && p.species.toLowerCase() === species.toLowerCase()
        );

      if (!plant) {
        plant = {
          id: uuidv4(),
          species: species || "Unknown",
          nickname: nickname || "",
          images: [],
          conversations: [],
        };
        if (owner) plant.owner = owner;
        db[requestedType].push(plant);
        subjectCollection = requestedType;
      } else {
        subjectCollection = requestedType;
      }
    }

    // create minimal image entry (area computed in background)
    const imgEntry = {
      id: uuidv4(),
      filename: path.basename(file.path),
      uploadedAt: new Date().toISOString(),
      area: null,
      firebaseUrl: null, // Will be populated after Firebase upload
    };
    plant.images = plant.images || [];
    plant.images.push(imgEntry);
    plant.conversations = plant.conversations || [];

    // create placeholder message quickly
    const msgEntry = {
      id: uuidv4(),
      role: "plant",
      text: fallbackPlantMessage(
        plant.species,
        plant.nickname || plant.species,
        null,
        imgEntry
      ),
      time: new Date().toISOString(),
      imageId: imgEntry.id,
      growthDelta: null,
    };
    plant.conversations.push(msgEntry);
    
    // Set firebaseUrl to the public /uploads/ URL
    imgEntry.firebaseUrl = `${process.env.API_BASE_URL || 'https://plant-app-backend-h28h.onrender.com'}/uploads/${imgEntry.filename}`;
    
    // Save to database
    writeDB(db);

    // respond quickly to the client before doing Firebase upload
    // Firebase upload will happen in background
    try {
      const subjectTypeResp =
        subjectCollection === "flowers" ? "flower" : "plant";
      const subjectObj = {
        id: plant.id,
        species: plant.species,
        nickname: plant.nickname,
        images: plant.images,
        conversations: plant.conversations,
      };
      const resp = {
        success: true,
        subjectType: subjectTypeResp,
        [subjectTypeResp]: subjectObj,
        message: msgEntry.text,
        careHint: null,
        identification: plant.identification || null,
        imageUrl: `/uploads/${imgEntry.filename}`,
        firebaseImageUrl: null, // Will be populated in background
        imageFilename: imgEntry.filename,
        imageId: imgEntry.id,
        growthDelta: null,
        similarity: null,
        likelyDifferentPlant: false,
        speciesDetected: null,
        speciesMismatch: false,
      };
      res.json(resp);
    } catch (e) {
      console.error("Failed to build upload response", e);
      res.json({
        success: true,
        message: msgEntry.text,
        imageFilename: imgEntry.filename,
        imageId: imgEntry.id,
      });
    }

    // Background processing: analyze image, detect species, compute similarity/growth and update DB and conversations (including LLM enrichment)
    (async () => {
      try {
        console.log("🔄 Background processing started for image:", imgEntry.id);
        console.log("   Firebase bucket status - initialized?", !!bucket, "bucket.name:", bucket?.name || "N/A");
        
        // Note: Supabase Storage upload already completed synchronously before response

        // image analysis
        let area = 0;
        try {
          area = await analyzeGreenArea(file.path);
        } catch (err) {
          console.error(
            "analyzeGreenArea failed",
            err && (err.stack || err.message || err)
          );
          area = 0;
        }

        // plant identification
        let plantnet = null;
        try {
          console.log("⏳ Background: Starting species detection...");
          plantnet = await callPlantNet(file.path);
          console.log("✅ Background: Species detection completed:", plantnet);
        } catch (err) {
          console.error(
            "callPlantNet failed",
            err && (err.stack || err.message || err)
          );
          plantnet = null;
        }

        // compute similarity and growth (if previous image exists)
        let similarity = null;
        let likelyDifferentPlant = false;
        let growth = null;
        let speciesDetected = null;
        let speciesMismatch = false;
        try {
          const freshDb = readDB();
          const target = findSubjectById(freshDb, plant.id);
          if (plantnet && target) {
            target.identification = target.identification || {};
            target.identification.species = plantnet.species;
            target.identification.probability = plantnet.probability || null;
            // Update the main species field if it's still "Unknown" or empty
            if (
              (!target.species || target.species === "Unknown") &&
              plantnet.species
            ) {
              console.log(
                `🌿 Background: Updating species from "${target.species}" to "${plantnet.species}"`
              );
              target.species = plantnet.species;
            }

            // Smart auto-categorization: if species suggests it's a flower but it's in plants, move it
            if (plantnet.species) {
              const detectedType = classifyAsFlowerOrPlant(plantnet.species);
              const currentCollection =
                subjectCollection === "flowers" ? "flower" : "plant";

              console.log(
                `🔍 Classification check: species="${plantnet.species}", detected=${detectedType}, current=${currentCollection}`
              );

              if (detectedType !== currentCollection) {
                console.log(
                  `🌸 Auto-categorization: "${plantnet.species}" detected as ${detectedType}, moving from ${currentCollection} to ${detectedType}`
                );

                // Ensure both collections exist
                if (!freshDb.plants) freshDb.plants = [];
                if (!freshDb.flowers) freshDb.flowers = [];

                // Remove from current collection
                const removeFrom =
                  currentCollection === "flower" ? "flowers" : "plants";
                const removeIdx = freshDb[removeFrom].findIndex(
                  (p) => p.id === target.id
                );
                if (removeIdx >= 0) {
                  freshDb[removeFrom].splice(removeIdx, 1);
                  console.log(`✅ Removed from ${removeFrom} collection`);
                }

                // Add to correct collection (but only if not already there!)
                const addTo = detectedType === "flower" ? "flowers" : "plants";
                const alreadyExists = freshDb[addTo].some(
                  (p) => p.id === target.id
                );
                if (!alreadyExists) {
                  freshDb[addTo].push(target);
                  console.log(`✅ Successfully moved to ${addTo} collection`);
                } else {
                  console.log(
                    `⚠️  Item already exists in ${addTo}, skipping duplicate add`
                  );
                }

                subjectCollection = addTo;

                // Save DB immediately and notify client right away (don't wait for other processing)
                writeDB(freshDb);
                sendSSE("categorized", {
                  subjectId: target.id,
                  subjectType: detectedType,
                  species: plantnet.species,
                });
              } else {
                console.log(
                  `ℹ️  No move needed: detected type matches current collection`
                );
              }
            }
          }

          // find previous image (the one before the one we just pushed)
          const imgs = target && target.images ? target.images : [];
          const idx = imgs.findIndex((i) => i.id === imgEntry.id);
          if (idx > 0) {
            const prev = imgs[idx - 1];
            if (prev && prev.filename) {
              // compute similarity using pHash preferred
              const aPath = file.path;
              const bPath = path.join(UPLOAD_DIR, prev.filename);
              try {
                const phA = await imagePHash(aPath);
                const phB = await imagePHash(bPath);
                const ham = hammingDistanceBits(phA, phB);
                similarity = Math.max(0, Math.min(1, 1 - ham / 64));
              } catch (phErr) {
                try {
                  similarity = await imageSimilarity(aPath, bPath);
                } catch (_) {
                  similarity = null;
                }
              }
              likelyDifferentPlant =
                typeof similarity === "number" ? similarity < 0.45 : false;
            }
            // compute growth if prev.area exists
            if (prev && typeof prev.area === "number") {
              growth = (area - prev.area) / Math.max(prev.area, 0.0001);
            }
          }

          // update image entry area and any identification
          // locate the image entry in freshDb and update
          if (target) {
            const imgObj = target.images.find((i) => i.id === imgEntry.id);
            if (imgObj) imgObj.area = area;
            // flag species mismatch
            speciesDetected =
              plantnet && plantnet.species ? plantnet.species : null;
            if (speciesDetected && target.species) {
              try {
                if (
                  speciesDetected.toLowerCase().trim() !==
                  String(target.species || "")
                    .toLowerCase()
                    .trim()
                )
                  speciesMismatch = true;
              } catch (e) {
                speciesMismatch = false;
              }
            }

            // update the placeholder conversation entry with growth/flags (text will be replaced by LLM later)
            target.conversations = target.conversations || [];
            const convIdx = target.conversations.findIndex(
              (c) => c.id === msgEntry.id
            );
            if (convIdx !== -1) {
              target.conversations[convIdx].growthDelta = growth;
            }
            writeDB(freshDb);

            // Build rich profile context for LLM enrichment
            ensureProfile(target);
            updateProfileFromConversation(target, {
              role: "user",
              text: "(New photo uploaded)",
            });
            const profileSummary = buildProfileSummary(target);

            // Build prompt/context for LLM enrichment
            const system = {
              role: "system",
              content: `You are a friendly houseplant that speaks in first-person, warmly and briefly. Do NOT include any meta commentary about prompts, instructions, or system messages. Reply directly as the plant, 1-3 sentences, mention visible changes or one concise care tip when relevant, and avoid prefatory or apologetic framing. Do NOT invent or assert a nickname; use the recorded nickname only if present. Avoid starting with 'Hi', 'Hello', or 'Hi there'.`,
            };
            // Build recent messages, collapse consecutive duplicate user messages
            const rawRecent = (target.conversations || [])
              .slice(-8)
              .map((m) => ({
                role: m.role === "user" ? "user" : "assistant",
                content: m.text,
              }))
              // filter out assistant placeholder/template messages
              .filter(
                (m) =>
                  !(m.role === "assistant" && isPlaceholderAssistant(m.content))
              );
            const contextMsgs = [];
            for (const msg of rawRecent) {
              const last = contextMsgs[contextMsgs.length - 1];
              if (
                last &&
                last.role === "user" &&
                msg.role === "user" &&
                String(last.content).trim() === String(msg.content).trim()
              )
                continue;
              contextMsgs.push(msg);
            }
            // Expand short ambiguous user prompts (e.g., "compare with previous") into explicit instructions
            for (let i = 0; i < contextMsgs.length; i++) {
              if (contextMsgs[i].role === "user") {
                const txt = String(contextMsgs[i].content || "")
                  .trim()
                  .toLowerCase();
                if (
                  txt === "compare with previous" ||
                  txt === "compare" ||
                  txt === "compare previous"
                ) {
                  contextMsgs[i].content =
                    "Please compare the most recent photo with the previous photo and describe visible changes (size, leaf area, pests, color), give a short growth percentage if available, and suggest one concise care action.";
                }
              }
            }
            const speciesInfo =
              plantnet && plantnet.species
                ? `${plantnet.species} (identified)`
                : target.species;
            let careHint = "";
            if (area < 0.02)
              careHint = "The plant looks very dry and may need water soon.";
            else if (growth != null && growth < -0.03)
              careHint =
                "It looks like I might be shrinking—maybe I need more care.";
            else if (growth != null && growth > 0.05)
              careHint = "I seem to be growing well!";
            let differentNote = "";
            if (likelyDifferentPlant)
              differentNote =
                "\n\nP.S. The photo you uploaded looks visually different from the previous photo — if this is a different plant, consider creating a new entry so I can track it separately.";
            if (speciesMismatch)
              differentNote += `\n\nP.P.S. Plant.id detected a different species (${speciesDetected}) compared to this plant's recorded species.`;
            // Provide concise image analysis info as system-level context (keeps it out of user-visible prefatory text)
            const analysisNote =
              `IMAGE ANALYSIS:\nspecies=${speciesInfo}; growth=${
                typeof growth === "number"
                  ? Math.round(growth * 100) + "%"
                  : "unknown"
              }; note=${
                careHint || "none"
              }\n\nPLANT PROFILE:\n${profileSummary}` +
              (differentNote ? "\n\n" + differentNote : "");
            // Put a concise analysis as a system message after the main system instruction
            contextMsgs.unshift({ role: "system", content: analysisNote });

            // call LLM to create a richer reply and update DB when available
            try {
              // Log the messages we're about to send (truncated) for debugging
              try {
                const dbg = [system, ...contextMsgs].map((m) => ({
                  role: m.role,
                  content: (m.content || m).toString().slice(0, 400),
                }));
                writeReplyDebug(
                  "/background LLM_CALL messages " +
                    JSON.stringify(dbg).slice(0, 2000)
                );
              } catch (e) {}
              const fullMsg = await callOpenAIChat([system, ...contextMsgs]);
              if (fullMsg) {
                const freshDb2 = readDB();
                const target2 = findSubjectById(freshDb2, target.id);
                if (target2) {
                  target2.conversations = target2.conversations || [];
                  const idx2 = target2.conversations.findIndex(
                    (c) => c.id === msgEntry.id
                  );
                  if (idx2 !== -1) {
                    target2.conversations[idx2].text = fullMsg;
                    target2.conversations[idx2].time = new Date().toISOString();
                  } else {
                    target2.conversations.push({
                      id: uuidv4(),
                      role: "plant",
                      text: fullMsg,
                      time: new Date().toISOString(),
                      imageId: imgEntry.id,
                      growthDelta: growth,
                    });
                  }
                  // Make sure profile is persisted to database
                  ensureProfile(target2);
                  writeDB(freshDb2);
                  try {
                    // notify connected clients that enrichment finished for this subject
                    sendSSE("enriched", {
                      subjectId: target2.id,
                      subjectType:
                        db.flowers &&
                        db.flowers.find((p) => p.id === target2.id)
                          ? "flower"
                          : "plant",
                    });
                  } catch (e) {
                    /* continue */
                  }
                }
              }
            } catch (llErr) {
              console.error(
                "Background LLM call failed",
                llErr && (llErr.stack || llErr.message || llErr)
              );
            }
          }
        } catch (bgErr) {
          console.error(
            "Background processing failed",
            bgErr && (bgErr.stack || bgErr.message || bgErr)
          );
        }
      } catch (outerErr) {
        console.error(
          "❌ Upload background worker error:",
          outerErr && (outerErr.stack || outerErr.message || outerErr)
        );
      }
    })();
  } catch (e) {
    console.error("❌ Upload endpoint error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Reply endpoint: user sends text and server will save it and optionally call LLM to produce plant reply
app.post("/reply", requireToken, express.json(), async (req, res) => {
  try {
    // accept plantId or subjectId (for flowers) for backwards compatibility
    const { plantId, subjectId, text, imageId, language } = req.body;
    const lang = language || "en";
    writeReplyDebug(
      "/reply INCOMING " +
        JSON.stringify({
          plantId,
          language: lang,
          text:
            typeof text === "string"
              ? text.length > 120
                ? text.slice(0, 120) + "..."
                : text
              : typeof text,
          imageId,
        })
    );
    console.log("[/reply] incoming", {
      plantId,
      language: lang,
      text:
        typeof text === "string"
          ? text.length > 120
            ? text.slice(0, 120) + "..."
            : text
          : typeof text,
      imageId,
    });
    const idToUse = subjectId || plantId;
    if (!idToUse || !text)
      return res.status(400).json({ error: "subject id and text required" });
    const db = readDB();
    const plant = findSubjectById(db, idToUse);
    if (!plant) return res.status(404).json({ error: "Subject not found" });
    plant.conversations = plant.conversations || [];

    const userEntry = {
      id: uuidv4(),
      role: "user",
      text,
      imageId: imageId || null,
      time: new Date().toISOString(),
    };
    plant.conversations.push(userEntry);
    writeDB(db);
    writeReplyDebug(
      "/reply SAVED_USER_MSG conv_len=" +
        (plant.conversations && plant.conversations.length)
    );
    console.log(
      "[/reply] saved user message, conversations length=",
      plant.conversations.length
    );

    // If OPENAI_API_KEY is not configured or FAST_REPLY=1, return a fast local reply to avoid network hangs
    if (!process.env.OPENAI_API_KEY || process.env.FAST_REPLY === "1") {
      try {
        const imagesLocal = plant.images || [];
        const lastImageLocal = imageId
          ? imagesLocal.find((i) => i.id === imageId)
          : imagesLocal.length
          ? imagesLocal[imagesLocal.length - 1]
          : null;
        let growthDeltaLocal = null;
        if (lastImageLocal) {
          const idx = imagesLocal.findIndex((i) => i.id === lastImageLocal.id);
          if (idx > 0) {
            const prev = imagesLocal[idx - 1];
            if (
              prev &&
              typeof prev.area === "number" &&
              typeof lastImageLocal.area === "number"
            ) {
              growthDeltaLocal =
                (lastImageLocal.area - Math.max(prev.area, 0.0001)) /
                Math.max(prev.area, 0.0001);
            }
          }
        }
        const fallback = fallbackPlantMessage(
          plant.species,
          plant.nickname || plant.species,
          growthDeltaLocal
        );
        const plantEntryFast = {
          id: uuidv4(),
          role: "plant",
          text: fallback,
          time: new Date().toISOString(),
          imageId: lastImageLocal ? lastImageLocal.id : null,
          growthDelta: growthDeltaLocal,
        };
        plant.conversations.push(plantEntryFast);
        writeDB(db);
        return res.json({
          success: true,
          reply: fallback,
          plant,
          imageId: lastImageLocal ? lastImageLocal.id : null,
          imageFilename: lastImageLocal ? lastImageLocal.filename : null,
          growthDelta: growthDeltaLocal,
        });
      } catch (e) {
        console.error("FAST reply failed", e && (e.stack || e.message || e));
        return res.status(500).json({ error: "fast-reply-failed" });
      }
    }

    // Build prompt with recent history and image analysis. Collapse duplicate user messages and expand short ambiguous prompts.
    const rawRecentRoute = (plant.conversations.slice(-8) || [])
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }))
      .filter(
        (m) => !(m.role === "assistant" && isPlaceholderAssistant(m.content))
      );
    const recentMsgsRoute = [];
    for (const m of rawRecentRoute) {
      const last = recentMsgsRoute[recentMsgsRoute.length - 1];
      if (
        last &&
        last.role === "user" &&
        m.role === "user" &&
        String(last.content).trim() === String(m.content).trim()
      )
        continue;
      recentMsgsRoute.push(m);
    }
    for (let i = 0; i < recentMsgsRoute.length; i++) {
      if (recentMsgsRoute[i].role === "user") {
        const txt = String(recentMsgsRoute[i].content || "")
          .trim()
          .toLowerCase();
        if (
          txt === "compare with previous" ||
          txt === "compare" ||
          txt === "compare previous"
        ) {
          recentMsgsRoute[i].content =
            "Please compare the most recent photo with the previous photo and describe visible changes (size, leaf area, pests, color), give a short growth percentage if available, and suggest one concise care action.";
        }
      }
    }
    const recent = recentMsgsRoute
      .map((m) => `${m.role === "user" ? "User:" : "Plant:"} ${m.content}`)
      .join("\n");
    // If the client specified an imageId, prefer that image for contextual analysis
    const images = plant.images || [];
    const selectedImage = imageId ? images.find((i) => i.id === imageId) : null;
    const lastImage =
      selectedImage || (images.length ? images[images.length - 1] : null);
    // compute growthDelta relative to the previous image (if available)
    let growthDelta = null;
    if (lastImage) {
      const idx = images.findIndex((i) => i.id === lastImage.id);
      if (idx > 0) {
        const prev = images[idx - 1];
        if (
          prev &&
          typeof prev.area === "number" &&
          typeof lastImage.area === "number"
        ) {
          const prevArea = Math.max(prev.area, 0.0001);
          growthDelta = (lastImage.area - prevArea) / prevArea;
        }
      }
    }
    const imageInfo = lastImage
      ? `Image selected: uploadedAt=${lastImage.uploadedAt}, area=${lastImage.area}` +
        (selectedImage && selectedImage !== images[images.length - 1]
          ? " (not the most recent image)"
          : "")
      : "";

    // Build rich profile context for LLM
    ensureProfile(plant);
    updateProfileFromConversation(plant, userEntry);
    const profileSummary = buildProfileSummary(plant);

    // Provide an explicit species line so the model can answer species questions directly
    const speciesLine =
      plant.identification && plant.identification.species
        ? `Recorded species (PlantNet): ${
            plant.identification.species
          } (probability: ${plant.identification.probability || "unknown"})`
        : `Recorded species: ${plant.species || "Unknown"}`;
    const speciesInstruction = /species|which species|what species/i.test(text)
      ? "If the user is asking about species, answer directly with the recorded species and any identification confidence. Keep it short and do not include meta commentary."
      : "";

    const prompt = `${speciesLine}\n${speciesInstruction}\nYou are a friendly houseplant${
      plant.nickname ? ` named ${plant.nickname}` : ""
    } (species: ${
      plant.species
    }).\n\nMEMORY:\n${profileSummary}\n\nContext:\n${imageInfo}\n\nConversation history (most recent first):\n${recent}\n\nUser says: \"${text}\"\n\nRespond warmly in first-person as the plant with a 1-3 sentence reply. Feel like a friend or sibling. Mention visible changes or care tips naturally if relevant. Don't be technical or mention timestamps.`;

    console.log("[/reply] calling LLM with prompt length", prompt.length);
    writeReplyDebug("/reply BEFORE_CALL_OPENAI prompt_len=" + prompt.length);
    // also log a truncated view of the prompt for diagnostics
    try {
      writeReplyDebug(
        "/reply PROMPT " +
          JSON.stringify({ prompt: String(prompt).slice(0, 1200) })
      );
    } catch (e) {}
    let plantReply = null;
    try {
      // route-level timeout: don't let an LLM/network hang take down the request
      plantReply = await Promise.race([
        callOpenAIForMessage(prompt, lang),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("LLM call timed out (route-level)")),
            12000
          )
        ),
      ]);
      writeReplyDebug(
        "/reply AFTER_CALL_OPENAI returned_type=" + typeof plantReply
      );
      console.log(
        "[/reply] LLM returned",
        typeof plantReply === "string"
          ? plantReply.length > 120
            ? plantReply.slice(0, 120) + "..."
            : plantReply
          : plantReply
      );
    } catch (e) {
      console.error(
        "[/reply] LLM call error",
        e && (e.stack || e.message || e)
      );
      try {
        writeReplyDebug(
          "/reply AFTER_CALL_OPENAI ERROR " + (e && (e.message || String(e)))
        );
      } catch (e2) {}
      plantReply = null;
    }
    if (!plantReply) {
      // Use the shared fallback generator so replies vary with species/nickname and growth
      try {
        writeReplyDebug("/reply USING_FALLBACK_GENERATOR");
      } catch (e) {}
      plantReply = fallbackPlantMessage(
        plant.species,
        plant.nickname || plant.species,
        growthDelta,
        lastImage
      );
    }

    // If response is in English, also generate Kannada version
    let plantReplyKannada = null;
    if (lang === "en" && plantReply) {
      try {
        console.log("[/reply] Generating Kannada translation...");
        const transRes = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are a Kannada translator. Translate the following text to natural, colloquial Kannada that a native Kannada speaker would use in everyday conversation. Use authentic Kannada expressions and tone, not formal or English-sounding Kannada. Sound like a friendly Kannada person giving advice. Respond with ONLY the translated text, nothing else.",
              },
              {
                role: "user",
                content: `Translate to colloquial Kannada: "${plantReply}"`,
              },
            ],
            temperature: 0.3,
            max_tokens: 300,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        plantReplyKannada =
          transRes.data.choices?.[0]?.message?.content?.trim();
        console.log("[/reply] Kannada translation:", plantReplyKannada);
      } catch (transErr) {
        console.warn("[/reply] Kannada translation failed:", transErr.message);
      }
    }

    // If response is in Kannada, also generate English version
    let plantReplyEnglish = null;
    if (lang === "kn" && plantReply) {
      try {
        console.log("[/reply] Generating English translation...");
        const transRes = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are a translator. Translate the following text to English naturally and accurately. Respond with ONLY the translated text, nothing else.",
              },
              {
                role: "user",
                content: `Translate to English: "${plantReply}"`,
              },
            ],
            temperature: 0.3,
            max_tokens: 300,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        plantReplyEnglish =
          transRes.data.choices?.[0]?.message?.content?.trim();
        console.log("[/reply] English translation:", plantReplyEnglish);
      } catch (transErr) {
        console.warn("[/reply] English translation failed:", transErr.message);
      }
    }

    const plantEntry = {
      id: uuidv4(),
      role: "plant",
      text: plantReply,
      text_en: plantReplyEnglish || (lang === "en" ? plantReply : null),
      text_kn: plantReplyKannada || (lang === "kn" ? plantReply : null),
      time: new Date().toISOString(),
      imageId: lastImage ? lastImage.id : null,
      growthDelta: typeof growthDelta === "number" ? growthDelta : null,
    };
    plant.conversations.push(plantEntry);

    // Make sure profile is persisted to database
    ensureProfile(plant);
    writeDB(db);

    res.json({
      success: true,
      reply: plantReply,
      reply_en: plantEntry.text_en,
      reply_kn: plantEntry.text_kn,
      plant,
      imageId: lastImage ? lastImage.id : null,
      imageFilename: lastImage ? lastImage.filename : null,
      growthDelta: typeof growthDelta === "number" ? growthDelta : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Translate endpoint: translates text between languages
app.post("/translate", requireToken, express.json(), async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    const lang = targetLanguage || "en";

    console.log("[/translate] translating text to", lang);

    // Use OpenAI to translate
    if (process.env.OPENAI_API_KEY) {
      const prompt = `Translate the following text to ${
        lang === "kn" ? "Kannada" : "English"
      }. Return ONLY the translated text, nothing else.

Text: "${text}"`;

      const systemPrompt = `You are a translator. Translate text accurately and naturally. Respond with ONLY the translated text, no explanations.`;

      try {
        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 500,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        const translatedText =
          response.data.choices?.[0]?.message?.content?.trim();

        if (!translatedText) {
          console.warn("[/translate] OpenAI returned empty response");
          return res.json({ translatedText: text }); // Fallback to original
        }

        console.log(
          "[/translate] translation successful:",
          translatedText.substring(0, 100)
        );
        res.json({ translatedText });
      } catch (err) {
        console.error("[/translate] OpenAI error:", err.message);
        res.json({ translatedText: text }); // Fallback to original on error
      }
    } else {
      // No OpenAI key, return original text
      res.json({ translatedText: text });
    }
  } catch (err) {
    console.error("[/translate] error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Fast reply endpoint for diagnostics: uses local fallback only (no network/LLM)
app.post("/reply-fast", requireToken, express.json(), (req, res) => {
  try {
    const { plantId, text, imageId } = req.body || {};
    if (!plantId || !text)
      return res.status(400).json({ error: "plantId and text required" });
    const db = readDB();
    const plant = db.plants.find((p) => p.id === plantId);
    if (!plant) return res.status(404).json({ error: "Plant not found" });
    plant.conversations = plant.conversations || [];

    const userEntry = {
      id: uuidv4(),
      role: "user",
      text,
      imageId: imageId || null,
      time: new Date().toISOString(),
    };
    plant.conversations.push(userEntry);

    // compute a simple growthDelta using last images if available
    let growthDelta = null;
    const images = plant.images || [];
    const lastImage = imageId
      ? images.find((i) => i.id === imageId)
      : images.length
      ? images[images.length - 1]
      : null;
    if (lastImage) {
      const idx = images.findIndex((i) => i.id === lastImage.id);
      if (idx > 0) {
        const prev = images[idx - 1];
        if (
          prev &&
          typeof prev.area === "number" &&
          typeof lastImage.area === "number"
        ) {
          growthDelta =
            (lastImage.area - Math.max(prev.area, 0.0001)) /
            Math.max(prev.area, 0.0001);
        }
      }
    }

    // local fallback reply
    const plantReply = fallbackPlantMessage(
      plant.species,
      plant.nickname || plant.species,
      growthDelta,
      lastImage
    );
    const plantEntry = {
      id: uuidv4(),
      role: "plant",
      text: plantReply,
      time: new Date().toISOString(),
      imageId: lastImage ? lastImage.id : null,
      growthDelta: growthDelta,
    };
    plant.conversations.push(plantEntry);
    writeDB(db);

    return res.json({
      success: true,
      reply: plantReply,
      plant,
      imageId: lastImage ? lastImage.id : null,
      imageFilename: lastImage ? lastImage.filename : null,
      growthDelta,
    });
  } catch (err) {
    console.error("reply-fast failed", err);
    return res.status(500).json({ error: err && err.message });
  }
});

// Delete an image for a plant (remove DB entry and file)
// Tokenless by default for single-recipient installs
app.delete("/plants/:id/images/:imgId", (req, res) => {
  try {
    const { id, imgId } = req.params;
    console.log("[DELETE] /plants/:id/images/:imgId", { id, imgId });
    const db = readDB();
    const plant = db.plants.find((p) => p.id === id);
    if (!plant) return res.status(404).json({ error: "Plant not found" });
    const imgIdx = (plant.images || []).findIndex((i) => i.id === imgId);
    if (imgIdx === -1)
      return res.status(404).json({ error: "Image not found" });
    const img = plant.images[imgIdx];
    console.log("[DELETE] found image", {
      filename: img.filename,
      imgId: img.id,
    });
    // remove file if exists
    try {
      const full = path.join(UPLOAD_DIR, img.filename);
      console.log("[DELETE] attempting unlink", full);
      if (fs.existsSync(full)) fs.unlinkSync(full);
      console.log("[DELETE] file removed", full);
    } catch (e) {
      console.warn("Failed to remove image file", e && e.message);
    }
    // remove from array
    plant.images.splice(imgIdx, 1);
    // if plant has no images left, remove the plant entirely
    if (!plant.images || plant.images.length === 0) {
      const pIdx = db.plants.findIndex((pp) => pp.id === plant.id);
      if (pIdx !== -1) db.plants.splice(pIdx, 1);
    }
    // persist
    writeDB(db);
    return res.json({ success: true, plant });
  } catch (e) {
    console.error("Delete image failed", e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// Delete an image for a flower (mirror the plants route)
app.delete("/flowers/:id/images/:imgId", (req, res) => {
  try {
    const { id, imgId } = req.params;
    console.log("[DELETE] /flowers/:id/images/:imgId", { id, imgId });
    const db = readDB();
    db.flowers = db.flowers || [];
    const flower = db.flowers.find((p) => p.id === id);
    if (!flower) return res.status(404).json({ error: "Flower not found" });
    const imgIdx = (flower.images || []).findIndex((i) => i.id === imgId);
    if (imgIdx === -1)
      return res.status(404).json({ error: "Image not found" });
    const img = flower.images[imgIdx];
    console.log("[DELETE] found flower image", {
      filename: img.filename,
      imgId: img.id,
    });
    try {
      const full = path.join(UPLOAD_DIR, img.filename);
      console.log("[DELETE] attempting unlink", full);
      if (fs.existsSync(full)) fs.unlinkSync(full);
      console.log("[DELETE] file removed", full);
    } catch (e) {
      console.warn("Failed to remove image file", e && e.message);
    }
    flower.images.splice(imgIdx, 1);
    if (!flower.images || flower.images.length === 0) {
      const pIdx = db.flowers.findIndex((pp) => pp.id === flower.id);
      if (pIdx !== -1) db.flowers.splice(pIdx, 1);
    }
    writeDB(db);
    return res.json({ success: true, flower });
  } catch (e) {
    console.error("Delete flower image failed", e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// Admin: prune plants that have no images. Idempotent and safe.
app.post("/admin/prune-empty-plants", (req, res) => {
  try {
    const db = readDB();
    const before = (db.plants || []).length;
    db.plants = (db.plants || []).filter(
      (p) => p.images && p.images.length > 0
    );
    const after = db.plants.length;
    writeDB(db);
    return res.json({ success: true, before, after });
  } catch (e) {
    console.error("Prune failed", e);
    return res.status(500).json({ error: e && e.message });
  }
});

// Admin: clear all data and delete uploads (destructive). Protected by invite token if configured.
app.post("/admin/clear-all", requireToken, (req, res) => {
  try {
    // delete upload files
    try {
      const files = fs.readdirSync(UPLOAD_DIR);
      files.forEach((f) => {
        try {
          fs.unlinkSync(path.join(UPLOAD_DIR, f));
        } catch (e) {
          console.warn("failed to remove upload", f, e && e.message);
        }
      });
    } catch (e) {
      console.warn("failed to list uploads", e && e.message);
    }
    // reset DB
    const newDb = { plants: [], flowers: [] };
    writeDB(newDb);
    return res.json({ success: true });
  } catch (e) {
    console.error("clear-all failed", e);
    return res.status(500).json({ error: e && e.message });
  }
});

// Create a new plant record from an existing image (move image from one plant to a new plant)
app.post("/plants/new-from-image", requireToken, express.json(), (req, res) => {
  try {
    const { fromPlantId, imgId, nickname, species } = req.body || {};
    if (!fromPlantId || !imgId)
      return res.status(400).json({ error: "fromPlantId and imgId required" });
    const db = readDB();
    const from = db.plants.find((p) => p.id === fromPlantId);
    if (!from) return res.status(404).json({ error: "Source plant not found" });
    const imgIdx = (from.images || []).findIndex((i) => i.id === imgId);
    if (imgIdx === -1)
      return res.status(404).json({ error: "Image not found on source plant" });
    const img = from.images[imgIdx];

    // remove image from source plant
    from.images.splice(imgIdx, 1);

    // create new plant
    const newPlant = {
      id: uuidv4(),
      species: species || from.species || "Unknown",
      nickname: nickname || "",
      images: [img],
      conversations: [],
    };
    db.plants.push(newPlant);

    // if source plant has no images left, remove it
    if (!from.images || from.images.length === 0) {
      const idx = db.plants.findIndex((p) => p.id === from.id);
      if (idx !== -1) db.plants.splice(idx, 1);
    }

    writeDB(db);
    return res.json({ success: true, newPlant });
  } catch (e) {
    console.error("Create new plant from image failed", e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// Admin helper: trigger enrichment for a given subject/image on-demand.
// Body: { subjectId, imageId, useFallback }
app.post(
  "/admin/trigger-enrich",
  requireToken,
  express.json(),
  async (req, res) => {
    try {
      const { subjectId, imageId, useFallback } = req.body || {};
      if (!subjectId)
        return res.status(400).json({ error: "subjectId required" });
      const db = readDB();
      const target = findSubjectById(db, subjectId);
      if (!target) return res.status(404).json({ error: "Subject not found" });

      // find the image entry if provided
      const imgs = target.images || [];
      const imgObj = imageId
        ? imgs.find((i) => i.id === imageId)
        : imgs[imgs.length - 1];
      if (!imgObj)
        return res.status(404).json({ error: "Image not found for subject" });

      // compute area if possible (will update DB)
      try {
        const p = path.join(UPLOAD_DIR, imgObj.filename);
        if (fs.existsSync(p)) {
          const a = await analyzeGreenArea(p);
          imgObj.area = typeof a === "number" ? a : imgObj.area;
        }
      } catch (e) {
        console.warn("Admin trigger analyzeGreenArea failed", e && e.message);
      }

      // optional plant identification
      let plantnet = null;
      try {
        const p = path.join(UPLOAD_DIR, imgObj.filename);
        if (fs.existsSync(p)) plantnet = await callPlantNet(p);
      } catch (e) {
        console.warn("Admin trigger callPlantNet failed", e && e.message);
      }

      // compute similarity/growth against previous image
      let similarity = null;
      let likelyDifferentPlant = false;
      let growth = null;
      let speciesDetected = null;
      let speciesMismatch = false;
      try {
        const idx = imgs.findIndex((i) => i.id === imgObj.id);
        if (idx > 0) {
          const prev = imgs[idx - 1];
          const aPath = path.join(UPLOAD_DIR, imgObj.filename);
          const bPath = path.join(UPLOAD_DIR, prev.filename);
          try {
            const phA = await imagePHash(aPath);
            const phB = await imagePHash(bPath);
            const ham = hammingDistanceBits(phA, phB);
            similarity = Math.max(0, Math.min(1, 1 - ham / 64));
          } catch (e) {
            try {
              similarity = await imageSimilarity(aPath, bPath);
            } catch (__) {
              similarity = null;
            }
          }
          likelyDifferentPlant =
            typeof similarity === "number" ? similarity < 0.45 : false;
          if (
            prev &&
            typeof prev.area === "number" &&
            typeof imgObj.area === "number"
          ) {
            growth = (imgObj.area - prev.area) / Math.max(prev.area, 0.0001);
          }
        }
        speciesDetected =
          plantnet && plantnet.species ? plantnet.species : null;
        if (speciesDetected && target.species) {
          if (
            String(speciesDetected || "")
              .toLowerCase()
              .trim() !==
            String(target.species || "")
              .toLowerCase()
              .trim()
          )
            speciesMismatch = true;
        }
      } catch (e) {
        console.warn("Admin trigger similarity/growth failed", e && e.message);
      }

      // Build system + context similar to background worker
      const system = {
        role: "system",
        content: `You are a friendly houseplant that speaks in first-person, warmly and briefly. Do NOT include any meta commentary about prompts, instructions, or system messages. Reply directly as the plant, 1-3 sentences, mention visible changes or one concise care tip when relevant, and avoid prefatory or apologetic framing.`,
      };
      // Build recent messages for admin trigger (dedupe and expand ambiguous prompts)
      const rawRecentAdmin = (target.conversations || [])
        .slice(-8)
        .map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text,
        }))
        .filter(
          (m) => !(m.role === "assistant" && isPlaceholderAssistant(m.content))
        );
      const contextMsgs = [];
      for (const msg of rawRecentAdmin) {
        const last = contextMsgs[contextMsgs.length - 1];
        if (
          last &&
          last.role === "user" &&
          msg.role === "user" &&
          String(last.content).trim() === String(msg.content).trim()
        )
          continue;
        contextMsgs.push(msg);
      }
      for (let i = 0; i < contextMsgs.length; i++) {
        if (contextMsgs[i].role === "user") {
          const txt = String(contextMsgs[i].content || "")
            .trim()
            .toLowerCase();
          if (
            txt === "compare with previous" ||
            txt === "compare" ||
            txt === "compare previous"
          ) {
            contextMsgs[i].content =
              "Please compare the most recent photo with the previous photo and describe visible changes (size, leaf area, pests, color), give a short growth percentage if available, and suggest one concise care action.";
          }
        }
      }
      const speciesInfo =
        plantnet && plantnet.species
          ? `${plantnet.species} (identified)`
          : target.species;
      let careHint = "";
      if (typeof imgObj.area === "number") {
        if (imgObj.area < 0.02)
          careHint = "The plant looks very dry and may need water soon.";
        else if (growth != null && growth < -0.03)
          careHint =
            "It looks like I might be shrinking—maybe I need more care.";
        else if (growth != null && growth > 0.05)
          careHint = "I seem to be growing well!";
      }
      let differentNote = "";
      if (likelyDifferentPlant)
        differentNote =
          "\n\nP.S. The photo you uploaded looks visually different from the previous photo — if this is a different plant, consider creating a new entry.";
      if (speciesMismatch)
        differentNote += `\n\nP.P.S. Plant.id detected a different species (${speciesDetected}) compared to this plant's recorded species.`;
      const analysisNote =
        `Image analysis: species=${speciesInfo}; growth=${
          typeof growth === "number"
            ? Math.round(growth * 100) + "%"
            : "unknown"
        }; note=${careHint || "none"}` +
        (differentNote ? " " + differentNote : "");
      contextMsgs.unshift({ role: "system", content: analysisNote });

      // Produce enriched reply using LLM or fallback
      let fullMsg = null;
      if (useFallback || !process.env.OPENAI_API_KEY) {
        fullMsg = fallbackPlantMessage(
          target.species,
          target.nickname || target.species,
          growth,
          imgObj
        );
      } else {
        try {
          // Log admin trigger messages
          try {
            const dbg = [system, ...contextMsgs].map((m) => ({
              role: m.role,
              content: (m.content || m).toString().slice(0, 400),
            }));
            writeReplyDebug(
              "/admin LLM_CALL messages " + JSON.stringify(dbg).slice(0, 2000)
            );
          } catch (e) {}
          fullMsg = await callOpenAIChat([system, ...contextMsgs]);
        } catch (e) {
          console.error(
            "Admin trigger LLM call failed",
            e && (e.stack || e.message || e)
          );
          fullMsg = null;
        }
      }

      // write enriched reply into DB
      try {
        const freshDb2 = readDB();
        const target2 = findSubjectById(freshDb2, subjectId);
        if (target2) {
          target2.conversations = target2.conversations || [];
          // try to replace the placeholder conversation referring to this image
          const convIdx = target2.conversations.findIndex(
            (c) => c.imageId === imgObj.id && c.role === "plant"
          );
          if (convIdx !== -1 && fullMsg) {
            target2.conversations[convIdx].text = fullMsg;
            target2.conversations[convIdx].time = new Date().toISOString();
          } else if (fullMsg) {
            target2.conversations.push({
              id: uuidv4(),
              role: "plant",
              text: fullMsg,
              time: new Date().toISOString(),
              imageId: imgObj.id,
              growthDelta: growth,
            });
          }
          // persist area update if present
          const imgInTarget = target2.images.find((i) => i.id === imgObj.id);
          if (imgInTarget && typeof imgObj.area === "number")
            imgInTarget.area = imgObj.area;
          writeDB(freshDb2);

          // notify connected clients
          try {
            sendSSE("enriched", {
              subjectId: target2.id,
              subjectType:
                db.flowers && db.flowers.find((p) => p.id === target2.id)
                  ? "flower"
                  : "plant",
            });
          } catch (e) {}
        }
      } catch (e) {
        console.error(
          "Admin trigger DB write failed",
          e && (e.stack || e.message || e)
        );
      }

      return res.json({ success: true, enriched: !!fullMsg, reply: fullMsg });
    } catch (e) {
      console.error(
        "/admin/trigger-enrich failed",
        e && (e.stack || e.message || e)
      );
      return res.status(500).json({ error: e && e.message });
    }
  }
);

app.get("/plants", async (req, res) => {
  try {
    const plants = await getPlants();
    res.json(Array.isArray(plants) ? plants : Object.values(plants || {}));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Diagnostic endpoint to check Firebase configuration
app.get("/admin/firebase-status", (req, res) => {
  const status = {
    firebaseInitialized: !!admin.apps.length,
    bucketInitialized: !!bucket,
    bucketName: bucket ? bucket.name : null,
    credentials: {
      projectId: process.env.FIREBASE_PROJECT_ID || "my-soulmates",
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKeyId: !!process.env.FIREBASE_PRIVATE_KEY_ID,
    },
    status: bucket ? "✅ Ready" : "❌ Not initialized",
  };
  res.json(status);
});

// Check upload directory
app.get("/admin/upload-status", (req, res) => {
  try {
    const uploadDirExists = fs.existsSync(UPLOAD_DIR);
    let files = [];
    let totalSize = 0;
    
    if (uploadDirExists) {
      files = fs.readdirSync(UPLOAD_DIR).slice(0, 20); // First 20 files
      files.forEach(f => {
        const filePath = path.join(UPLOAD_DIR, f);
        try {
          totalSize += fs.statSync(filePath).size;
        } catch (e) {
          // ignore
        }
      });
    }
    
    res.json({
      uploadDirPath: UPLOAD_DIR,
      uploadDirExists,
      fileCount: uploadDirExists ? fs.readdirSync(UPLOAD_DIR).length : 0,
      sampleFiles: files,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Test Firebase Storage upload
app.get("/admin/test-firebase-upload", async (req, res) => {
  try {
    console.log("🧪 Testing Firebase Storage upload");
    console.log("   Bucket initialized?", !!bucket);
    console.log("   Bucket name:", bucket?.name || "N/A");
    
    // First, test if we can list files (permission test)
    if (bucket) {
      try {
        console.log("🧪 Testing bucket permissions by listing files...");
        const [files] = await bucket.getFiles({ maxResults: 1 });
        console.log("✅ Bucket read permissions OK - can list files");
      } catch (e) {
        console.warn("⚠️  Bucket read permission test failed:", e.message);
      }
    }
    
    // Create a simple test file
    const testFilePath = path.join(__dirname, "test-file.txt");
    fs.writeFileSync(testFilePath, "Test content for Firebase Storage");
    
    console.log("🧪 Attempting Firebase Storage upload with test file");
    const firebaseUrl = await uploadFileToFirebaseStorage(
      testFilePath,
      "test/test-file.txt"
    );
    
    // Clean up
    try {
      fs.unlinkSync(testFilePath);
    } catch (e) {
      // ignore
    }
    
    if (firebaseUrl) {
      res.json({
        success: true,
        message: "Firebase Storage upload successful",
        url: firebaseUrl,
      });
    } else {
      res.json({
        success: false,
        message: "Firebase Storage upload failed - check server logs for details",
        bucketStatus: {
          initialized: !!bucket,
          name: bucket?.name,
        },
      });
    }
  } catch (e) {
    console.error("Test endpoint error:", e);
    res.status(500).json({
      success: false,
      error: e.message,
      stack: e.stack,
    });
  }
});

app.get("/plants/:id", async (req, res) => {
  try {
    const plant = await getPlantById(req.params.id);
    if (!plant) return res.status(404).json({ error: "Not found" });
    res.json(plant);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get care schedule for a plant (watering frequency inference)
app.get("/plants/:id/care-schedule", (req, res) => {
  try {
    const db = readDB();
    const plant = db.plants.find((p) => p.id === req.params.id);
    if (!plant) return res.status(404).json({ error: "Plant not found" });

    const schedule = inferWateringSchedule(plant);
    res.json({ success: true, schedule });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get multi-plant analytics dashboard
app.get("/analytics/plants", (req, res) => {
  try {
    const db = readDB();
    const plants = db.plants || [];

    const analytics = plants.map((p) => {
      const profile = ensureProfile(p);
      const images = p.images || [];
      let latestGrowth = null;

      if (images.length >= 2) {
        const latest = images[images.length - 1];
        const prev = images[images.length - 2];
        if (latest.area && prev.area) {
          latestGrowth = Math.round(
            ((latest.area - prev.area) / prev.area) * 100
          );
        }
      }

      return {
        id: p.id,
        nickname: p.nickname,
        species: p.species,
        totalPhotos: images.length,
        latestGrowth,
        healthStatus: computeHealthStatus(p),
        careScore: computeCareScore(p),
        adoptedDays: Math.floor(
          (Date.now() - new Date(profile.adoptedDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      };
    });

    res.json({ success: true, analytics });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin endpoint: re-analyze all images with null area (fixes old uploads)
app.post(
  "/admin/reanalyze-images",
  requireToken,
  express.json(),
  async (req, res) => {
    try {
      const db = readDB();
      const plants = db.plants || [];
      let reanalyzed = 0;

      for (const plant of plants) {
        const images = plant.images || [];
        for (const img of images) {
          if (img.area === null && img.filename) {
            try {
              const filePath = path.join(UPLOAD_DIR, img.filename);
              if (fs.existsSync(filePath)) {
                const area = await analyzeGreenArea(filePath);
                img.area = area;
                reanalyzed++;
                console.log(`Re-analyzed ${img.filename}: area=${area}`);
              }
            } catch (err) {
              console.error(
                `Failed to re-analyze ${img.filename}:`,
                err.message
              );
            }
          }
        }
      }

      writeDB(db);
      res.json({
        success: true,
        message: `Re-analyzed ${reanalyzed} images`,
        reanalyzed,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
);

// Return a single flower by id (parity with plants)
app.get("/flowers/:id", async (req, res) => {
  try {
    const flower = await getFlowerById(req.params.id);
    if (!flower) return res.status(404).json({ error: "Not found" });
    res.json(flower);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Flowers endpoints (lightweight parity with plants)
app.get("/flowers", async (req, res) => {
  try {
    const flowers = await getFlowers();
    res.json(Array.isArray(flowers) ? flowers : Object.values(flowers || {}));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/flowers", requireToken, express.json(), async (req, res) => {
  try {
    const { species = "Unknown", nickname = "", images = [] } = req.body || {};
    const newFlower = {
      species,
      nickname,
      images,
      conversations: [],
    };
    const flower = await addFlower(newFlower);
    res.json({ success: true, flower });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server started on port ${PORT}`)
);

// Informational warning if ElevenLabs TTS is not configured so operators see why /tts/eleven returns 403
if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) {
  console.warn(
    "ElevenLabs TTS not configured: set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID to enable server TTS proxy"
  );
}

// Informational warning if Plant.id API is not configured
if (!process.env.PLANTNET_API_KEY) {
  console.warn(
    "⚠️  Plant.id API not configured: set PLANTNET_API_KEY in .env to enable automatic species detection. Get a free API key at https://plant.id/"
  );
}

// --- TTS provider support (ElevenLabs proxy) ---
// Environment variables:
// ELEVENLABS_API_KEY - your ElevenLabs key (do NOT commit this)
// ELEVENLABS_VOICE_ID - voice id to use (required to generate audio)

app.get("/tts/providers", (req, res) => {
  const providers = {
    elevenlabs:
      !!process.env.ELEVENLABS_API_KEY && !!process.env.ELEVENLABS_VOICE_ID,
    azure: !!process.env.AZURE_SPEECH_KEY && !!process.env.AZURE_SPEECH_REGION,
  };
  res.json(providers);
});

app.post("/tts/eleven", requireToken, express.json(), async (req, res) => {
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voiceId)
    return res
      .status(403)
      .json({ error: "ElevenLabs not configured on server" });
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: "text required" });

  try {
    // Proxy the request to ElevenLabs text-to-speech endpoint and return audio/mpeg
    const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      voiceId
    )}`;
    const r = await withTimeout(
      fetch(elevenUrl, {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          voice_settings: { stability: 0.4, similarity_boost: 0.6 },
        }),
      }),
      10000
    );

    if (!r.ok) {
      const txt = await r.text();
      console.error("ElevenLabs TTS error", r.status, txt);
      return res
        .status(502)
        .json({ error: "ElevenLabs TTS request failed", details: txt });
    }

    const arrayBuffer = await withTimeout(r.arrayBuffer(), 8000);
    const buffer = Buffer.from(arrayBuffer);
    res.set("Content-Type", "audio/mpeg");
    res.set("Content-Length", buffer.length);
    return res.send(buffer);
  } catch (err) {
    console.error("TTS proxy failed", err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// Reset endpoint for testing - clears all plants and flowers
app.post("/admin/reset", async (req, res) => {
  try {
    const emptyDb = { plants: [], flowers: [] };

    // Clear database
    await writeDB(emptyDb);
    console.log("✅ Database cleared");

    res.json({
      success: true,
      message: "Database reset - all data cleared",
    });
  } catch (e) {
    console.error("Reset error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Diagnostic: show raw db.json content
app.get("/admin/db-content", async (req, res) => {
  try {
    const db = await readDB();
    res.json({
      plantsCount: (db.plants || []).length,
      flowersCount: (db.flowers || []).length,
      plantIds: (db.plants || []).map(p => p.id),
      flowerIds: (db.flowers || []).map(f => f.id)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Diagnostic endpoint to check if persistent disk is working
app.get("/disk-status", (req, res) => {
  try {
    const uploadDir = UPLOAD_DIR;
    const testFile = path.join(uploadDir, ".disk-test");
    const timestamp = new Date().toISOString();
    
    // Try to write a test file
    fs.writeFileSync(testFile, `Disk test at ${timestamp}`);
    
    // Try to read it back
    const content = fs.readFileSync(testFile, 'utf-8');
    
    // List files in uploads directory
    let files = [];
    if (fs.existsSync(uploadDir)) {
      files = fs.readdirSync(uploadDir).filter(f => f !== '.disk-test');
    }
    
    res.json({
      diskAvailable: true,
      uploadDir: uploadDir,
      testFileWritten: true,
      testFileContent: content,
      filesInUploads: files,
      fileCount: files.length,
      message: "Persistent disk is working if .disk-test file exists after server restart"
    });
  } catch (e) {
    res.status(500).json({
      diskAvailable: false,
      error: e.message,
      message: "Cannot write to disk - may be ephemeral storage"
    });
  }
});
