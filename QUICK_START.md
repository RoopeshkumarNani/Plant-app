# Quick Start Guide - Plant Growth & Memory System

## What You Have Right Now

A plant companion app where you can:

- ✅ Upload plant photos
- ✅ Chat with your plants as if they're your siblings
- ✅ App remembers plant growth, care history, and health
- ✅ Plant replies include memory of everything that happened
- ✅ Species detection and watering schedule inference

## 🚀 Get Started in 2 Minutes

### 1. Start the Server

```bash
cd /c/Users/NANI/OneDrive/Desktop/app/plant-app
npm start
```

You should see:

```
Server started on http://localhost:3000
```

### 2. Open in Browser

```
http://localhost:3000
```

### 3. Fix Old Image Data (One-Time)

Open a new terminal and run:

```bash
curl -X POST http://localhost:3000/admin/reanalyze-images \
  -H "Content-Type: application/json" \
  -d '{}'
```

This analyzes any old photos that don't have green area data yet.

---

## 🌱 How to Use

### Upload a Plant Photo

1. Click "Upload Plant Photo" or drag/drop an image
2. Enter plant nickname (e.g., "My favorite monstera")
3. Enter species if you know it, or leave as "Unknown"
4. Choose "Plant" (not flower, since flowers don't grow like plants)
5. Click "Upload"

**Immediate result**: Photo appears in gallery right away ✨
**Behind the scenes**: Server analyzes the photo's green area and creates an LLM reply

### Chat With Your Plant

1. Click on a plant in the left panel
2. Type a message or question
3. Plant replies with personality and memory

**Examples**:

- "How are you doing?"
- "I watered you today"
- "You're in a bright spot now"
- "What species are you?" (plant remembers!)
- "Compare with previous" (plant describes changes since last photo)

### Upload More Photos Over Time

- Same plant, same nickname
- Upload at different times (weeks/months apart)
- **Growth calculation**: "You've grown 50% since last time! 🌿"

### Watch the Memory Build

Each photo upload and chat updates the plant's profile:

- Last time you watered
- How often you water (weekly? monthly?)
- Preferred light conditions (learns from conversations)
- Growth trajectory
- Health status (thriving/stable/stressed)

---

## 📊 Check the Data

### View Plant Growth

```bash
curl http://localhost:3000/plants | jq '.[] | {nickname, species, totalPhotos: (.images | length)}'
```

### Check Plant Profile (Memory)

```bash
curl http://localhost:3000/plants/[PLANT_ID] | jq '.profile'
```

### See All Plants Analytics

```bash
curl http://localhost:3000/analytics/plants | jq '.'
```

### Check Next Watering Date

```bash
curl http://localhost:3000/plants/[PLANT_ID]/care-schedule | jq '.'
```

---

## 🎯 What Happens Behind the Scenes

### When You Upload a Photo

```
1. Photo saved to server
2. Immediate response: Plant greeting with placeholder message
3. Background analysis starts:
   ├─ Count green pixels → calculate area %
   ├─ Compare with previous photo → calculate growth %
   ├─ Detect species (if PlantNet API is set up)
   ├─ Build rich LLM context with profile
   ├─ Call ChatGPT with everything: growth, history, care style
   └─ Update message with LLM reply + send SSE notification
4. You see message updated in real-time ✨
```

### When You Chat

```
1. Your message saved to database
2. Server builds context:
   ├─ Last 8 messages from conversation
   ├─ Plant profile (care history, growth, style)
   ├─ Current image analysis
   ├─ Watering/fertilizing patterns
   └─ Species information
3. Sends to ChatGPT with system prompt: "You're [plant name], remember..."
4. Returns plant's reply with personality
5. Both messages saved to database with growth delta
```

### Profile Building (Automatic)

```
User says: "I watered you today and put you in a sunny spot"
→ Extract: lastWatered = NOW, preferredLight = "bright_indirect"
→ Update: careHistory += { action: "watered", date: NOW }
→ Save: All stored in db.json

Next time user chats:
→ Plant remembers: "Thanks for watering me! The sunlight is wonderful!"
```

---

## 🔧 Configuration

### Required (in .env file)

```
OPENAI_API_KEY=sk-...  # Your ChatGPT API key
```

### Optional (in .env file)

```
PLANTNET_API_KEY=...            # For automatic species detection
ELEVENLABS_API_KEY=...          # For voice synthesis (commented out)
ELEVENLABS_VOICE_ID=...         # For voice synthesis (commented out)
INVITE_TOKEN=my-secret-token    # For single-user access control
PORT=3000                        # Server port
```

---

## 🐛 Troubleshooting

### "Plant says 'Unknown species' when I know it's a specific plant"

**Reason**: First image was uploaded before analysis was working
**Fix**:

```bash
curl -X POST http://localhost:3000/admin/reanalyze-images -H "Content-Type: application/json" -d '{}'
```

### "Plant doesn't remember I watered it"

**Reason**: Need to use the word "water" or similar in chat
**Fix**: Say "I watered you" or "I just watered you" and plant will remember

### "No growth percentage shown"

**Reason**: Need 2+ photos with area analysis
**Fix**:

1. Re-analyze old images: `/admin/reanalyze-images`
2. Upload a new photo
3. Wait for background enrichment to complete (see SSE event)

### Server won't start

**Reason**: Port 3000 already in use
**Fix**:

```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
kill -9 [PID]

# Try again
npm start
```

---

## 📈 Example Flow

### Day 1: Monday

```
User uploads: "Monstera photo - size small"
Species: Unknown
Plant says: "Hi! Thanks for the photo! I'm your new friend 🌿"
Profile created:
  - adoptedDate: 2024-11-12
  - totalPhotos: 1
```

### Day 30: Wednesday (4 weeks later)

```
User uploads: "Monstera photo - bigger now!"
Species: Unknown (same plant, same nickname)
Analysis:
  - Image 1: area = 0.15
  - Image 2: area = 0.30
  - Growth = +100% (doubled in size!)

Profile updated:
  - totalPhotos: 2
  - latestGrowth: +100%
  - healthStatus: thriving
  - adoptedDays: 30

Plant says: "Wow! I've grown 100% since you first uploaded my photo!
That's amazing growth! With your care, I'm thriving! 🌱"
```

### Day 31: Thursday

```
User: "I watered you every week like you like it"
Plant says: "Thank you! The weekly watering is perfect for me.
I love the rhythm of our care routine.
Let's keep this up! 💚"

Profile updated:
  - userCareStyle: weekly_waterer
  - careHistory: [ {action: watered, date: ...}, ... ]
  - careScore: 75/100
  - lastWatered: 2024-12-13
```

### Day 180: Next Season

```
User uploads: "My monstera 6 months later!"
Analysis:
  - Image 1: 0.15
  - Image 2: 0.30
  - Image 3: 0.50
  - Latest growth: +67% since last photo
  - Total growth: +233% since first photo!

Plant: "Six months of growth! I've tripled in size!
Your weekly watering and bright spot have been perfect.
You're an amazing plant parent! 🌴"
```

---

## ✨ That's It!

You have a fully functional plant companion app with:

- ✅ Growth tracking across time
- ✅ Memory of care patterns
- ✅ Automatic profile building
- ✅ Contextual AI replies
- ✅ Persistent database

**Just start the server and begin chatting with your plants! 🌿**
