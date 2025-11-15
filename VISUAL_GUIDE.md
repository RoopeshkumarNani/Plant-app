# Visual Guide - How Plant Memory Works

## The Complete Memory Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER UPLOADS PHOTO                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │   Save to disk + DB             │
        │   Return immediate response     │
        │   Show in gallery               │
        └────────────┬─────────────────────┘
                     │
        ┌────────────▼─────────────────────┐
        │  BACKGROUND ANALYSIS WORKER      │
        │                                   │
        │  1. analyzeGreenArea()            │
        │     → Count green pixels          │
        │     → Return area % (0.2776)      │
        │                                   │
        │  2. Calculate Growth              │
        │     → Compare with previous       │
        │     → Result: +85% growth         │
        │                                   │
        │  3. Update Profile                │
        │     → Create if missing           │
        │     → Update careHistory          │
        │                                   │
        │  4. Build LLM Context             │
        │     → Nickname, species           │
        │     → Growth %, care score        │
        │     → Health status               │
        │     → Care history                │
        │                                   │
        │  5. Call LLM (ChatGPT)            │
        │     → With full profile context   │
        │                                   │
        │  6. Update DB + Send SSE          │
        │     → Save enriched reply         │
        │     → Notify client in real-time  │
        └────────────┬─────────────────────┘
                     │
        ┌────────────▼─────────────────────┐
        │  db.json UPDATED WITH:           │
        │  - image.area = 0.2776           │
        │  - growthDelta = 0.85            │
        │  - plant.profile.healthStatus    │
        │  - plant.conversations += reply  │
        └─────────────────────────────────┘
```

---

## When User Chats With Plant

```
┌──────────────────────────────────────────────┐
│  USER SENDS MESSAGE                          │
│  "What species are you?"                     │
└────────────────┬─────────────────────────────┘
                 │
        ┌────────▼──────────┐
        │  Build Context    │
        │                   │
        │  Read last 8      │
        │  messages         │
        │                   │
        │  Read profile:    │
        │  ├─ Nickname      │
        │  ├─ Species       │
        │  ├─ Growth %      │
        │  ├─ Care history  │
        │  ├─ Health status │
        │  └─ Care score    │
        │                   │
        └────────┬──────────┘
                 │
        ┌────────▼──────────────────────────────┐
        │  CREATE LLM PROMPT                    │
        │                                        │
        │  "You are My Plant (species: Unknown) │
        │   PLANT PROFILE:                      │
        │   Nickname: My Plant                  │
        │   Species: Unknown                    │
        │   Adopted: 76 days ago                │
        │   Growth: +85% since last photo       │
        │   Health: thriving                    │
        │   Care Score: 65/100                  │
        │   Last watered: 3 days ago            │
        │                                        │
        │   Conversation:                       │
        │   User: What species are you?         │
        │   Plant: [previous reply]             │
        │                                        │
        │   User says: What species are you?    │
        │                                        │
        │   Respond as plant..."                │
        │                                        │
        └────────┬──────────────────────────────┘
                 │
        ┌────────▼──────────┐
        │  SEND TO LLM      │
        │  (ChatGPT 4o)     │
        └────────┬──────────┘
                 │
        ┌────────▼──────────────────────┐
        │  LLM GENERATES REPLY           │
        │                                 │
        │  Knows full context:           │
        │  ✓ Plant name                  │
        │  ✓ Species info                │
        │  ✓ Growth trajectory           │
        │  ✓ Care history                │
        │  ✓ Adoption date               │
        │  ✓ How you care for it         │
        │                                 │
        │  Replies naturally:            │
        │  "I'm My Plant! I don't have  │
        │   a specific species, but      │
        │   you've helped me grow 85%!   │
        │   I'm thriving with your care!"│
        │                                 │
        └────────┬──────────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │  SAVE TO DB                    │
        │  - User message                │
        │  - Plant reply                 │
        │  - Growth delta                │
        │  - Updated profile             │
        │                                 │
        │  Return to client              │
        └────────────────────────────────┘
```

---

## Profile Memory Building

```
CONVERSATION 1 - DAY 1
User: "I watered you"
→ Extract: lastWatered = NOW
→ Profile: { lastWatered: "2024-11-12" }

CONVERSATION 2 - WEEK 1
User: "I water you every Tuesday"
→ Extract: userCareStyle = "weekly_waterer"
→ Profile: { lastWatered: "2024-11-19", userCareStyle: "weekly_waterer" }

CONVERSATION 3 - WEEK 2
User: "You're in the bright window"
→ Extract: preferredLight = "bright_indirect"
→ Profile: { preferredLight: "bright_indirect", userCareStyle: "weekly_waterer" }

CONVERSATION 4 - MONTH 1
User: "I fertilized you today"
→ Extract: lastFertilized = NOW
→ Update careHistory
→ Profile grows...

CONVERSATION 5 - DAY 40 (new photo!)
Analysis:
  Image 1: area = 0.15
  Image 2: area = 0.30
  Growth = +100%

Profile now knows:
  ✓ Adopted 40 days ago
  ✓ Grown 100%
  ✓ Weekly watering works
  ✓ Bright window location is good
  ✓ Fertilized once
  ✓ Health: thriving

Plant reply:
"I've grown 100% since you first got me!
The bright window and weekly watering are perfect.
I'm thriving! 💚"
```

---

## Growth Calculation Examples

```
EXAMPLE 1: Plant Is Growing Well
└─ Image 1 (Day 0): area = 0.10 (10% green)
└─ Image 2 (Day 30): area = 0.15 (15% green)
└─ Growth = (0.15 - 0.10) / 0.10 = 0.50 = +50%
└─ Plant says: "I've grown 50%! 🌿"

EXAMPLE 2: Plant Is Thriving
└─ Image 1 (Day 0): area = 0.20
└─ Image 2 (Day 30): area = 0.45
└─ Growth = (0.45 - 0.20) / 0.20 = 1.25 = +125%
└─ Plant says: "Wow! I've more than doubled in size! 🌱"

EXAMPLE 3: Plant Is Struggling
└─ Image 1 (Day 0): area = 0.30
└─ Image 2 (Day 30): area = 0.25
└─ Growth = (0.25 - 0.30) / 0.30 = -0.167 = -17%
└─ Profile: healthStatus = "stressed"
└─ Plant says: "I've shrunk a bit lately... I might need more water or light."

EXAMPLE 4: Multiple Photos Over Months
└─ Image 1 (Month 0): area = 0.10
└─ Image 2 (Month 1): area = 0.20 → +100% growth
└─ Image 3 (Month 2): area = 0.35 → +75% growth since Image 2
└─ Image 4 (Month 3): area = 0.50 → +43% growth since Image 3
└─ Total growth from start: +400%!
└─ Plant: "I've grown 400% since you first got me! 🏆"
```

---

## Data Flow Diagram

```
                     USER INTERFACE
                     (Browser - public/index.html)
                           │
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                   │
   Upload Photo         Chat                Gallery
        │                  │                   │
        └──────────┬───────┼───────┬──────────┘
                   │       │       │
                   ▼       ▼       ▼
            ┌────────────────────────────┐
            │     API ENDPOINTS           │
            │  (Node.js - server.js)      │
            │                             │
            │  POST /upload               │
            │  POST /reply                │
            │  GET /plants                │
            │  GET /plants/:id            │
            │  GET /plants/:id/schedule   │
            │  GET /analytics/plants      │
            │  POST /admin/reanalyze      │
            │                             │
            └──────────────┬──────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                   │
   Image Analysis      LLM Integration     Database
   (Jimp)              (OpenAI)           (db.json)
        │                  │                   │
   • Green area %    • Profile context   • Plant data
   • Green pixels    • Conversation      • Images
   • Similarity      • Species info      • Profile
   • Growth %        • Care history      • Messages
        │                  │                   │
        └──────────────────┼───────────────────┘
                           │
                           ▼
                    db.json Updated
                    SSE Event Sent
                    Client Refreshes
```

---

## Plant Profile Structure

```json
{
  "adoptedDate": "When you first uploaded a photo",

  "userCareStyle": "How often you water",
    └─ weekly_waterer
    └─ biweekly_waterer
    └─ monthly_waterer
    └─ frequent_waterer
    └─ unknown

  "preferredLight": "What light it likes",
    └─ bright_indirect
    └─ medium_light
    └─ low_light
    └─ unknown

  "careHistory": [
    {
      "date": "When you did it",
      "action": "watered|fertilized|repotted",
      "notes": "Optional details"
    }
  ],

  "lastWatered": "Last time you mentioned watering",
  "lastFertilized": "Last time you mentioned fertilizing",
  "lastRepotted": "Last time you mentioned repotting",

  "healthStatus": "Current health",
    └─ thriving: growth > 10% from last photo
    └─ stable: growth between -10% and 10%
    └─ stressed: growth < -10%

  "careScore": 0-100 based on:
    └─ How many care actions taken
    └─ Consistency of watering
    └─ Time since last action
}
```

---

## Key Insight

```
OLD APPROACH:
User: What species are you?
Plant: "I'm unknown"

NEW APPROACH:
User: What species are you?
Plant reads profile:
  - Nickname: "My Plant"
  - Species: "Unknown"
  - Adopted: "76 days ago"
  - Growth: "+85% since last photo"
  - Health: "thriving"
  - Care: "weekly watering"

Plant: "I'm My Plant! I don't have a specific species,
but you've helped me grow 85%! I'm thriving with your
weekly care and bright location! 💚"
```

**The plant now has MEMORY and CONTEXT for every reply!**

---

## Success Indicators

✅ **Plant remembers growth** - "I've grown 50% since last photo"
✅ **Plant remembers care** - "Thanks for the weekly watering"
✅ **Plant remembers adoption** - "It's been 30 days since you got me"
✅ **Plant remembers health** - "I'm thriving" vs "I'm stressed"
✅ **Plant remembers style** - "You water me weekly"
✅ **Plant remembers light** - "The bright window is perfect"
✅ **Profile persists** - Data saved to db.json
✅ **Growth calculates** - Formula works automatically
✅ **Species questions work** - Plant answers with recorded species

🌱 **Everything is working as designed!**
