# Plant Growth & Memory System - How It Works

## Current Data Status

### Plant 1: "My Plant" (ID: 13b4dc7e...)

```
Images:
  1. area: null         ❌ OLD - needs re-analysis
  2. area: 0.2776      ✅ NEW - analyzed successfully

Growth: BLOCKED because Image 1 has no area
```

### Plant 2: "Just Me" (species: Rose buddies)

```
Images:
  1. area: null        ❌ Only has 1 image, so no growth comparison possible anyway

Growth: N/A (needs 2+ images)
```

---

## How Growth Memory Works (Complete Flow)

### Step 1: Upload Image

User uploads a new photo of the plant.

```javascript
POST /upload
├─ Fast response: Insert image with area:null, return placeholder message immediately
└─ Background worker starts async processing
```

### Step 2: Background Image Analysis

```javascript
(async background worker)
├─ analyzeGreenArea(filePath)
│  └─ Returns: 0.2776 (27.76% of pixels are "green")
│
├─ IF previous image exists:
│  ├─ growth = (current_area - prev_area) / prev_area
│  ├─ Example: (0.2776 - null) = BLOCKED
│  └─ If BOTH have areas: (0.2776 - 0.15) / 0.15 = 85% growth
│
└─ UPDATE DB with area
   └─ Now image.area = 0.2776 (persisted to db.json)
```

### Step 3: Chat Context Building

When user chats with plant, the system builds rich context:

````javascript
POST /reply
├─ Read latest 8 messages
├─ BUILD PROFILE:
│  ├─ ensureProfile(plant)
│  │  └─ Creates profile if missing (auto-initializes)
│  │
│  ├─ updateProfileFromConversation(plant, userMessage)
│  │  └─ Extracts care facts:
│  │     ├─ "watered" → lastWatered = NOW
│  │     ├─ "fertilized" → lastFertilized = NOW
│  │     ├─ "weekly" → userCareStyle = "weekly_waterer"
│  │     └─ "bright" → preferredLight = "bright_indirect"
│  │
│  └─ buildProfileSummary(plant)
│     └─ Creates context string:
│        ```
│        Nickname: My Plant
│        Species: Unknown
│        Adopted: 76 days ago
│        Total photos: 2
│        Growth since last photo: +2776% (when both have areas)
│        Health Status: thriving/stable/stressed
│        Care Score: 65/100
│        Last watered: 3 days ago
│        ```
│
├─ BUILD PROMPT:
│  └─ "You are My Plant...
│     PLANT PROFILE:
│     [all the profile info above]
│
│     CONTEXT:
│     Image selected: area=0.2776
│
│     Conversation history:
│     User: What species are you?
│     Plant: [previous reply]
│     ...
│
│     User says: 'What species are you?'
│
│     Respond warmly as the plant..."
│
└─ CALL LLM with rich context
   └─ LLM now knows:
      ✅ Plant nickname
      ✅ Species (if recorded)
      ✅ Days since adoption
      ✅ Growth history
      ✅ Health status
      ✅ Care patterns
      ✅ Last watering date
      ✅ Full conversation history
````

### Step 4: Persistent Storage

After each chat reply:

```javascript
ensureProfile(plant); // Make sure profile object exists
writeDB(db); // Save plant WITH profile to db.json
```

---

## Why You're Seeing "Unknown Species"

**Problem**: The first image still has `area: null`

**Why**:

- Old uploads happened before background analysis was working properly
- These images were never re-analyzed

**Solution**: Run the re-analysis endpoint:

```bash
# Start server first
npm start

# In another terminal, call:
curl -X POST http://localhost:3000/admin/reanalyze-images \
  -H "Content-Type: application/json" \
  -H "x-invite-token: YOUR_TOKEN" \
  -d '{}'
```

This will:

1. Find all images with `area: null`
2. Re-analyze them with `analyzeGreenArea()`
3. Persist areas back to db.json
4. Now growth CAN be calculated between Image 1 and Image 2

---

## After Re-analysis, Growth Calculation

Once both images have areas:

```
Image 1: area = 0.15 (reanalyzed)
Image 2: area = 0.2776 (existing)

Growth % = (0.2776 - 0.15) / 0.15 × 100 = +85%

Now when LLM sees profile:
"Growth since last photo: +85%"

And plant's reply can be:
"Wow! I've grown 85% since the last time!
I'm thriving with your care. Keep it up!"
```

---

## Memory Persistence

### What Gets Saved to db.json

For each plant:

```json
{
  "id": "...",
  "species": "Unknown or Plant.id detected species",
  "nickname": "My Plant",
  "images": [
    {
      "id": "...",
      "filename": "...",
      "uploadedAt": "...",
      "area": 0.2776  ← RECALCULATED
    }
  ],
  "conversations": [
    {
      "role": "user",
      "text": "What species are you?",
      "time": "..."
    },
    {
      "role": "plant",
      "text": "I'm My Plant...",
      "growthDelta": 0.85  ← CALCULATED FROM AREAS
    }
  ],
  "profile": {
    "adoptedDate": "2025-09-28T...",
    "userCareStyle": "unknown",
    "preferredLight": "unknown",
    "lastWatered": null,
    "lastFertilized": null,
    "lastRepotted": null,
    "careHistory": [],
    "healthStatus": "stable",
    "careScore": 50
  }
}
```

---

## The Complete Memory Chain

1. **Upload photo** → area calculated in background
2. **Calculate growth** → (new area - old area) / old area
3. **Chat with plant** → profile extracted from messages
4. **Build context** → profile + conversation + growth + species
5. **LLM reply** → uses rich context to answer accurately
6. **Save everything** → db.json updated with profile
7. **Next upload** → profile is already there, build on it

---

## Next Steps

1. **Start server**: `npm start`
2. **Re-analyze old images**: `curl -X POST http://localhost:3000/admin/reanalyze-images -H "x-invite-token: YOUR_TOKEN" -d '{}'`
3. **Check db.json**: Old images should now have `area` values
4. **Chat with plant**: Growth % should now be calculated and included in context
5. **Verify**: Plant should answer "What species are you?" with the actual species

---

## Testing Growth Memory

### Test 1: Verify areas are calculated

```bash
curl http://localhost:3000/plants/13b4dc7e-c197-4dd3-9386-1a7c05e37897 | jq '.images'
```

Should show both images with `area` numbers.

### Test 2: Verify profile exists

```bash
curl http://localhost:3000/plants/13b4dc7e-c197-4dd3-9386-1a7c05e37897 | jq '.profile'
```

Should show profile object with all care history.

### Test 3: Check growth calculation

```bash
curl http://localhost:3000/plants/13b4dc7e-c197-4dd3-9386-1a7c05e37897 | jq '.conversations[] | select(.growthDelta != null)'
```

Should show messages with growth percentages.

### Test 4: Species question

POST to `/reply` with:

```json
{
  "plantId": "13b4dc7e-c197-4dd3-9386-1a7c05e37897",
  "text": "What species are you?"
}
```

Plant should now answer correctly with the recorded species.
