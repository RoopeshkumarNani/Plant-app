import functions from "firebase-functions";
import admin from "firebase-admin";
import express from "express";
import cors from "cors";
import multer from "multer";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import fetch from "node-fetch";
import { OpenAI } from "openai";
import sharp from "sharp";

// Initialize Firebase Admin
admin.initializeApp();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Setup multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PLANTNET_API_KEY = process.env.PLANTNET_API_KEY;

// System prompts
const SYSTEM_PROMPTS = {
  en: `You are a personable and friendly potted house plant with a unique personality. Answer in the first person, naturally and warmly, as if you're a dear friend giving advice. Be encouraging, thoughtful, and share wisdom from your perspective as a plant. Keep responses concise (2-3 sentences) unless asked for more detail.`,
  kn: `ನೀವು ವ್ಯಕ್ತಿತ್ವ ಹೊಂದಿರುವ ಮನೆಯ ಸಸ್ಯ. ನನ್ನಂತೆ ಮಾತನಾಡಿ - ನೈಸರ್ಗಿಕವಾಗಿ, ವ್ಯಕ್ತಿಗತವಾಗಿ, ಮತ್ತು ಸ್ನೇಹಪೂರ್ಣವಾಗಿ. ಮೊದಲ ವ್ಯಕ್ತಿಯಲ್ಲಿ ಉತ್ತರ ನೀಡಿ. ಸಂಕ್ಷಿಪ್ತವಾಗಿ (2-3 ವಾಕ್ಯಗಳು) ಮತ್ತು ಸ್ಪಷ್ಟವಾಗಿ.`,
};

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Plant app backend is running on Cloud Functions!" });
});

// Get all plants
app.get("/plants", (req, res) => {
  try {
    const owner = req.query.owner;
    const dbPath = join(__dirname, "../data/db.json");

    if (!fs.existsSync(dbPath)) {
      return res.json({ plants: [] });
    }

    const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    let plants = data.plants || [];

    if (owner && owner !== "all") {
      plants = plants.filter((p) => p.owner === owner);
    }

    res.json({ plants });
  } catch (e) {
    console.error("Error fetching plants:", e);
    res.status(500).json({ error: "Failed to fetch plants" });
  }
});

// Get all flowers
app.get("/flowers", (req, res) => {
  try {
    const owner = req.query.owner;
    const dbPath = join(__dirname, "../data/db.json");

    if (!fs.existsSync(dbPath)) {
      return res.json({ flowers: [] });
    }

    const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    let flowers = data.flowers || [];

    if (owner && owner !== "all") {
      flowers = flowers.filter((f) => f.owner === owner);
    }

    res.json({ flowers });
  } catch (e) {
    console.error("Error fetching flowers:", e);
    res.status(500).json({ error: "Failed to fetch flowers" });
  }
});

// Reply to plant (chat)
app.post("/reply", express.json(), async (req, res) => {
  try {
    const { id, message, language = "en" } = req.body;
    const dbPath = join(__dirname, "../data/db.json");
    const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

    // Find plant or flower
    let item =
      data.plants?.find((p) => p.id === id) ||
      data.flowers?.find((f) => f.id === id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Generate response using OpenAI
    const systemPrompt = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.en;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const reply = response.choices[0].message.content;

    // Translate to other language if needed
    let translatedReply = reply;
    if (language === "kn") {
      const transResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a Kannada translator. Translate the following text to natural, colloquial Kannada that a native Kannada speaker would use in everyday conversation. Use authentic Kannada expressions and tone, not formal or English-sounding Kannada. Sound like a friendly Kannada person giving advice. Respond with ONLY the translated text, nothing else.`,
          },
          { role: "user", content: reply },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });
      translatedReply = transResponse.choices[0].message.content;
    }

    res.json({
      text_en: reply,
      text_kn: language === "kn" ? translatedReply : reply,
    });
  } catch (e) {
    console.error("Error in /reply:", e);
    res.status(500).json({ error: "Failed to generate reply" });
  }
});

// Export the function for Firebase
export const api = functions.region("us-central1").https.onRequest(app);
