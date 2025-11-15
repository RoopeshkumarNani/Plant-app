# Plant Growth Tracking & Memory System - Complete Explanation

## How Growth Tracking Works

### 1. Upload Flow (When you upload an image of your plant)

```
User uploads photo of "My Plant"
    ↓
Server receives /upload request
    ↓
FAST PATH: Create placeholder message immediately (returns to user)
    ↓
BACKGROUND: Analyze image in background
    ├─ Calculate green area % (analyzeGreenArea)
    ├─ Compare with PREVIOUS image (if exists)
    │   ├─ Calculate growth: (current_area - previous_area) / previous_area
    │   └─ Example: If prev was 0.20 (20%) and current is 0.28 (28%)
    │       └─ Growth = (0.28 - 0.20) / 0.20 = 0.40 = **40% growth**
    ├─ Update DB with area for this image
    └─ Update growth delta in conversation entry
```

### 2. Memory System (Plant remembers everything)

The plant's memory is stored in `plant.profile`:

```javascript
{
  adoptedDate: "2025-09-28T05:25:03.263Z",     // When first uploaded
  userCareStyle: "unknown" / "weekly_waterer",  // Extracted from chat
  preferredLight: "unknown" / "bright_indirect", // Extracted from chat
  wateringFrequency: "unknown",
  commonIssues: [],
  lastWatered: "2025-11-12T05:00:00Z",         // Auto-detected from chat
  lastFertilized: null,
  lastRepotted: null,
  milestones: {
    oneWeek: true,
    oneMonth: true
  },
  careHistory: [                                 // Full timeline
    { date: "2025-11-12T05:00:00Z", action: "watered", notes: "" },
    { date: "2025-11-11T10:30:00Z", action: "fertilized", notes: "" }
  ],
  healthStatus: "thriving" / "stable" / "stressed",
  careScore: 75  // 0-100 based on consistency
}
```

### 3. When Chat Happens (User talks to plant)

**Step A: Build Rich Context**

```javascript
// In /reply route (around line 1282-1300 in server.js):

1. ensureProfile(plant)          // Initialize if missing
2. updateProfileFromConversation(plant, userEntry)  // Extract care facts
3. buildProfileSummary(plant)    // Create text like:

   "Nickname: My Plant
    Species: Unknown
    Adopted: 45 days ago
    Total photos: 2
    Growth since last photo: +40%
    Health Status: thriving
    Care Score: 75/100
    User Care Style: weekly waterer
    Last watered: 2 days ago
    Preferred Light: bright indirect"
```

**Step B: Include Profile in LLM Prompt**

```javascript
const prompt = `${speciesLine}
You are a friendly houseplant named ${plant.nickname} (species: ${plant.species}).

PLANT PROFILE:
${profileSummary}  // ← This is the key! Profile is in the context

Context:
${imageInfo}

Conversation history (most recent first):
${recent}

User says: "${text}"

Respond warmly as the plant...`;
```

**Step C: LLM Replies with Full Memory**
The LLM now knows:

- The plant's nickname and species ✅
- How many photos have been taken ✅
- Growth percentage (+40% if growing) ✅
- When it was last watered (from profile) ✅
- User's care style (weekly waterer, etc) ✅
- Health status (thriving/stable/stressed) ✅

---

## Your Data - What's Actually Happening

### Plant: "My Plant"

**Image 1**: 1759037103161-plant1.jpg

- Uploaded: 2025-09-28T05:25:03.263Z
- Area: **null** ← First image, no previous to compare to
- Growth: null

**Image 2**: 1759053068569-1759037103161-plant1.jpg

- Uploaded: 2025-09-28T09:51:08.591Z
- Area: **0.27758** (27.76% green)
- Growth: `(0.27758 - null) / null` = null ← Can't calculate because Image 1 has no area

**WHY?** Image 1 was uploaded but its analysis (area calculation) failed or was never completed.

---

## How to Test Growth Tracking

### Test Case 1: Verify Growth Calculation Works

```bash
# Manually set area for Image 1 in db.json:
{
  "id": "673fd86f-f139-44ea-9b3f-f9f7797ff2e7",
  "filename": "1759037103161-plant1.jpg",
  "uploadedAt": "2025-09-28T05:25:03.263Z",
  "area": 0.15  # ← Add this (15% green)
}

# Then open chat with My Plant
# The background enrichment will calculate:
# Growth = (0.27758 - 0.15) / 0.15 = 0.85 = 85% GROWTH!

# Chat should say something like:
# "I'm growing so well! I've increased by 85% since your last photo!"
```

### Test Case 2: Upload a New Image and Watch Profile Extract Care Facts

```
1. Open chat with "My Plant"
2. Type: "I watered you yesterday"
3. Send message
4. Watch db.json - profile.lastWatered will be set to NOW
5. Chat remembers "I was watered yesterday" for future replies
```

### Test Case 3: Species Question Should Work

```
1. Open chat with "My Plant"
2. Type: "What species are you?"
3. Server should say: "I'm My Plant (species: Unknown)"
4. If you manually set species in db.json:
   "species": "Monstera Deliciosa"
   Then next reply will include that!
```

---

## Key Functions Explained

### ensureProfile(plant)

```javascript
// Creates default profile if missing
function ensureProfile(plant) {
  if (!plant.profile) {
    plant.profile = {
      adoptedDate: new Date().toISOString(),
      userCareStyle: "unknown",
      lastWatered: null,
      careHistory: [],
      healthStatus: "stable",
      careScore: 50,
    };
  }
  return plant.profile;
}
```

### updateProfileFromConversation(plant, newMessage)

```javascript
// Runs after each chat message
// Extracts facts like:
// - User says "I watered..." → sets lastWatered = NOW
// - User says "I water weekly..." → sets userCareStyle = "weekly_waterer"
// - User says "bright window..." → sets preferredLight = "bright_indirect"
// - User says "I fertilize monthly..." → adds to careHistory
```

### buildProfileSummary(plant)

```javascript
// Creates readable profile text for LLM
// Includes:
// - Days since adoption (from adoptedDate)
// - Growth % (from comparing latest image areas)
// - Health status (from image growth trend)
// - Care score (from careHistory frequency)
// - User's care style (from chat extraction)
// - Last watering date (from chat or careHistory)
// - Light preference (from chat extraction)
```

### computeHealthStatus(plant)

```javascript
// Calculates if plant is thriving/stable/stressed
if (images.length >= 2) {
  const latest = images[images.length - 1];
  const prev = images[images.length - 2];

  if (!latest.area || !prev.area) return "stable";

  const growth = (latest.area - prev.area) / prev.area;
  if (growth > 0.1) return "thriving"; // 10%+ growth
  if (growth < -0.1) return "stressed"; // 10%+ shrinkage
  return "stable"; // Steady
}
```

---

## The Complete Memory Loop

```
User uploads photo of "My Plant"
    ↓
Image gets analyzed (green area %)
    ↓
Growth is calculated vs previous photo
    ↓
Background worker calls LLM with full profile context
    ↓
LLM reply includes: "You've grown 40%! You're thriving!"
    ↓
Chat message is stored in conversations[]
    ↓
NEXT TIME user talks to plant:
    ↓
/reply route builds context from:
  - Plant profile (adoptedDate, careHistory, healthStatus)
  - Recent conversations
  - Image analysis (area, growth)
  ↓
LLM sees full history and responds contextually
```

---

## Why Species Question Gave Wrong Answer

**Your data shows:**

```json
{
  "species": "Unknown",  // ← Plant's official species
  "nickname": "My Plant",
  ...
}
```

When you asked "What species are you?", the LLM saw:

- Species line: "Recorded species: Unknown"
- Profile: "Species: Unknown"

So it correctly answered "my species is unknown".

**To fix this:**

1. Identify the actual species (or make a guess)
2. Update db.json: `"species": "Monstera Deliciosa"`
3. Or upload a clear photo - PlantNet API will identify it automatically
4. Then chat will say: "I'm a Monstera Deliciosa!"

---

## Next Steps to Verify Everything Works

1. **Check server is running** ✅ (You confirmed it)
2. **Upload 2-3 photos of same plant** (should see green area calculated)
3. **Chat with plant about watering** (profile should extract "watered")
4. **Ask "How much have I grown?"** (should calculate growth %)
5. **Check db.json** (profile should have careHistory populated)

---

## Questions?

- How do I manually set the area for Image 1?
- Should I re-upload images to trigger analysis?
- Can I see the profile being built in debug logs?
