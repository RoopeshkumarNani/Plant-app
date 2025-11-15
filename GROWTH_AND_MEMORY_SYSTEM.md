# Plant Growth Tracking & Memory System - Complete Explanation

## Overview

Your app now has a **complete plant growth memory system**. Here's how it works:

---

## 1. HOW MULTIPLE IMAGES ARE STORED & COMPARED

### Upload Flow (Same Plant, Multiple Times)

When you upload an image for the **same plant**:

1. **Frontend sends**: `subjectType=plant, subjectId=<plantId>, photo=<image file>`
2. **Backend finds** the existing plant by ID
3. **New image is appended** to `plant.images[]` array in db.json
4. **Background worker**:
   - Analyzes green area percentage of NEW image
   - Compares it with PREVIOUS image using pHash (perceptual hashing)
   - Computes GROWTH DELTA: `(newArea - prevArea) / prevArea`

**Example**: Your Monstera photo timeline:

```
plant.images = [
  { id: "img1", filename: "2025-09-01-monstera.jpg", area: 0.25, uploadedAt: "2025-09-01T..." },
  { id: "img2", filename: "2025-09-15-monstera.jpg", area: 0.28, uploadedAt: "2025-09-15T..." },
  { id: "img3", filename: "2025-10-01-monstera.jpg", area: 0.32, uploadedAt: "2025-10-01T..." }
]
```

When img3 is uploaded:

- Growth = (0.32 - 0.28) / 0.28 = **+14%** growth since last photo
- Status: **thriving** (growth > 10%)

---

## 2. HOW THE CHAT REMEMBERS GROWTH

### Plant Profile (Persistent Memory)

Every plant now has a `profile` object that stores:

```javascript
plant.profile = {
  adoptedDate: "2025-09-01T00:00:00Z", // when first uploaded
  userCareStyle: "weekly_waterer", // extracted from chat
  preferredLight: "bright_indirect", // extracted from chat
  lastWatered: "2025-11-12T10:00:00Z", // extracted from chat
  lastFertilized: null,
  lastRepotted: null,
  careHistory: [
    { date: "2025-11-12T10:00:00Z", action: "watered", notes: "" },
    { date: "2025-11-05T14:30:00Z", action: "watered", notes: "" },
  ],
  healthStatus: "thriving", // calculated from growth
  careScore: 75, // calculated from consistency
  milestones: {
    oneWeek: true,
    oneMonth: true,
  },
  commonIssues: [],
};
```

### Profile is Built Automatically

**When you send a message to the plant:**

1. **Chat input**: "I watered it last night"
2. **updateProfileFromConversation()** extracts:
   - "water" keyword detected → `profile.lastWatered = now`
   - Adds to `careHistory` array
3. **Chat input**: "It's on my sunny window"
4. **updateProfileFromConversation()** extracts:
   - "sunny window" → `profile.preferredLight = "bright_indirect"`

This happens **automatically** - no manual entry needed!

---

## 3. HOW THE LLM USES THIS MEMORY

### Every Chat Message Includes Full Context

When you chat with a plant, the **full profile is sent to the LLM**:

```
User: "How is my Monstera doing?"

LLM Receives:
═══════════════════════════════════════════════════════════════
You are a friendly houseplant named Monstera (species: Monstera deliciosa).

PLANT PROFILE:
Nickname: Monstera
Species: Monstera deliciosa
Adopted: 72 days ago
Total photos: 3
Growth since last photo: +14%
Health Status: thriving
Care Score: 75/100
User Care Style: weekly waterer
Last watered: 1 day ago
Preferred Light: bright indirect

CONVERSATION HISTORY (most recent):
User: "How is my Monstera doing?"

═══════════════════════════════════════════════════════════════

Plant Response (from LLM):
"I'm doing great! You've been so consistent with watering me every week,
and I can feel the bright indirect light from your window.
The latest photo shows I've grown 14% since the last one!"
```

**The LLM has:**

- ✅ My adoption date (knows how long we've been together)
- ✅ My growth history (14% increase visible in photos)
- ✅ User's care style (weekly waterer = very consistent)
- ✅ Light conditions (bright indirect)
- ✅ Health status (thriving)
- ✅ Recent conversation history

---

## 4. HELPER FUNCTIONS THAT MAKE THIS WORK

### ensureProfile(plant)

Creates profile if missing, initializes all fields to defaults.

### updateProfileFromConversation(plant, message)

Scans message text for keywords:

- **Watering**: "water", "watering", "watered" → updates `lastWatered`
- **Fertilizing**: "fertil", "food", "nutrient" → updates `lastFertilized`
- **Repotting**: "repot", "pot", "soil", "transplant" → updates `lastRepotted`
- **Care style**: "daily", "weekly", "monthly" → sets `userCareStyle`
- **Light**: "bright", "sunny", "low light", "shade" → sets `preferredLight`

### computeHealthStatus(plant)

Compares latest image area with previous:

- Growth > 10% → **"thriving"**
- Growth between -10% and +10% → **"stable"**
- Growth < -10% → **"stressed"**

### computeCareScore(plant)

Scores 0-100 based on:

- Number of care actions in history
- Time since last care action (penalizes if >14 days)
- Consistency of care frequency

### buildProfileSummary(plant)

Creates the summary text that goes into every LLM prompt (see example above).

---

## 5. GROWTH CALCULATION IN DETAIL

### When You Upload Photo #2

**In background worker:**

```javascript
// Image analysis
const newArea = await analyzeGreenArea(newPhoto.path);
// Returns decimal 0.0 to 1.0 (e.g., 0.28 = 28% green pixels)

// Find previous image
const prevImage = plant.images[plant.images.length - 2];
const prevArea = 0.25;

// Calculate growth
const growth = (newArea - prevArea) / Math.max(prevArea, 0.0001);
// growth = (0.28 - 0.25) / 0.25 = 0.12 = +12%

// Store in conversation
conversation.push({
  role: "plant",
  text: "I'm looking good!",
  growthDelta: 0.12,
});

// Update profile
profile.healthStatus = computeHealthStatus(plant);
// Since growth (12%) > 10%, status = "thriving"
```

---

## 6. CHAT ALWAYS HAS CONTEXT

### Example Conversation Flow

**Day 1 - Upload Photo 1**

```
User uploads: Monstera photo (area = 0.25)
Plant: "Hi! I'm glad to meet you!"
```

**Day 15 - Upload Photo 2**

```
User uploads: Monstera photo (area = 0.28)
  ↓ LLM sees: "Growth: +12%, Health: thriving, Care Score: 60"
Plant: "I've grown since the last photo! Your care is working."
  ↓ Stored in DB with growthDelta: 0.12
User: "Are you happy in this location?"
  ↓ LLM sees: full history, last growth was +12%, bright indirect light preference
Plant: "Yes! The bright window is perfect. I've been growing steadily."
```

**Day 30 - Upload Photo 3**

```
User uploads: Monstera photo (area = 0.32)
  ↓ LLM sees: "Growth: +14%, Last growth: +12%, Trend: consistent improvement"
Plant: "I keep growing stronger! You're doing an amazing job."
```

---

## 7. HOW TO TEST THE GROWTH SYSTEM

### Manual Test Steps:

1. **Upload Photo 1 of your plant**

   - Note the green area percentage shown
   - Plant responds with welcome message

2. **Wait a few days (or just upload another angle)**

3. **Upload Photo 2 of same plant**

   - Backend calculates growth delta
   - LLM sees the growth metrics
   - Plant mentions the improvement (or lack thereof)

4. **Check db.json**

   ```json
   {
     "id": "plant-uuid",
     "nickname": "My Plant",
     "images": [
       { "id": "img1", "area": 0.25, ... },
       { "id": "img2", "area": 0.28, ... }
     ],
     "profile": {
       "adoptedDate": "2025-09-01T...",
       "healthStatus": "thriving",
       "careScore": 75,
       ...
     },
     "conversations": [...]
   }
   ```

5. **Chat with the plant about growth**
   - Ask: "How am I doing with care?"
   - Plant should reference: care score, growth metrics, adoption date, care style

---

## 8. KEY DIFFERENCES: PLANTS vs FLOWERS

| Aspect          | Plants                 | Flowers               |
| --------------- | ---------------------- | --------------------- |
| Growth Tracking | ✅ YES - area analyzed | ❌ NO - too variable  |
| Growth Chart    | ✅ Displayed           | ❌ Hidden             |
| Health Status   | ✅ Calculated          | ❌ Not calculated     |
| Profile Memory  | ✅ Full profile        | ⚠️ Basic profile only |
| Chat Context    | ✅ Full context        | ⚠️ Limited context    |

---

## 9. THE COMPLETE DATA FLOW

```
UPLOAD SAME PLANT (NEW PHOTO)
      ↓
Frontend sends: { subjectType: "plant", subjectId: "<id>", photo: file }
      ↓
Backend finds existing plant by ID
      ↓
New image pushed to plant.images[]
      ↓
BACKGROUND WORKER STARTS:
  1. analyzeGreenArea(newPhoto) → green percentage
  2. Compare with previous image's area
  3. Calculate growth delta
  4. Extract profile info from conversations
  5. Build profile summary
  6. Call LLM with FULL CONTEXT
  7. Store LLM reply + growth delta in conversations
      ↓
SSE NOTIFICATION sent to client
      ↓
Client updates gallery and chat in real-time
      ↓
PROFILE PERSISTED in db.json
      ↓
NEXT CHAT: LLM AUTOMATICALLY SEES:
  - All previous growth metrics
  - Care history
  - Health status
  - User's care patterns
```

---

## 10. HOW TO ADD MORE IMAGES TO SAME PLANT

**Option 1: Via Upload Form**

```
1. Open the plant's chat
2. Click "Manage photos" button
3. Upload new photo
4. Select: "Add to this plant"
```

**Option 2: Programmatically (for testing)**

```
curl -X POST http://localhost:3000/upload \
  -F photo=@photo2.jpg \
  -F subjectType=plant \
  -F subjectId=<plant-uuid>
```

The system will:

- Find the existing plant
- Add the new image
- Calculate growth from previous image
- Update health status
- Include in next LLM chat

---

## SUMMARY

✅ **Multiple images are stored** in plant.images[] array
✅ **Growth is calculated** automatically between consecutive images
✅ **Profile is built** from chat conversations (care facts extracted)
✅ **LLM always sees** the full profile, growth history, and care patterns
✅ **Chat is contextual** - responds to growth, health, adoption date, etc.
✅ **Memory persists** in db.json - nothing is lost between sessions

**Your plant remembers everything!** 🌱
