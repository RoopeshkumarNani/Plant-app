# Plant App Enhancement Implementation Guide

This guide explains all the enhancements and how to implement them.

## Phase 1: Make Chat Truly Reactive

### 1.1 Add Plant Profile Functions to server.js

Add these helper functions after the `findSubjectById` function (around line 147):

```javascript
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

// Helper: calculate health status based on growth and time
function computeHealthStatus(plant) {
  const profile = plant.profile || {};
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
  const profile = plant.profile || {};
  const careHistory = profile.careHistory || [];
  if (careHistory.length === 0) return 50;
  
  let score = 50;
  const recentActions = careHistory.slice(-10);
  
  if (recentActions.length >= 5) score += 20;
  if (recentActions.length >= 10) score += 10;
  
  if (recentActions.length > 0) {
    const lastAction = new Date(recentActions[recentActions.length - 1].date);
    const daysSinceAction = (Date.now() - lastAction.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAction > 14) score -= 15;
  }
  
  return Math.max(0, Math.min(100, score));
}

// Helper: extract care facts from conversation and update profile
function updateProfileFromConversation(plant, newMessage) {
  const profile = ensureProfile(plant);
  const text = String(newMessage.text || "").toLowerCase();
  
  // Detect care actions
  if (/water|watering|watered/.test(text)) {
    profile.lastWatered = new Date().toISOString();
    if (!profile.careHistory) profile.careHistory = [];
    profile.careHistory.push({ date: new Date().toISOString(), action: "watered", notes: "" });
  }
  if (/fertil|food|nutrient/.test(text)) {
    profile.lastFertilized = new Date().toISOString();
    if (!profile.careHistory) profile.careHistory = [];
    profile.careHistory.push({ date: new Date().toISOString(), action: "fertilized", notes: "" });
  }
  if (/repot|pot|soil|transplant/.test(text)) {
    profile.lastRepotted = new Date().toISOString();
    if (!profile.careHistory) profile.careHistory = [];
    profile.careHistory.push({ date: new Date().toISOString(), action: "repotted", notes: "" });
  }
  
  // Detect care style
  if (/daily|every day|often|frequent/.test(text)) profile.userCareStyle = "frequent_waterer";
  if (/weekly|once a week|week/.test(text)) profile.userCareStyle = "weekly_waterer";
  if (/bi-weekly|every other week|two weeks/.test(text)) profile.userCareStyle = "biweekly_waterer";
  if (/monthly|once a month/.test(text)) profile.userCareStyle = "monthly_waterer";
  
  // Detect light preferences
  if (/bright|sunny|direct light|window/.test(text)) profile.preferredLight = "bright_indirect";
  if (/low light|shade|dark/.test(text)) profile.preferredLight = "low_light";
  if (/medium light|partial shade/.test(text)) profile.preferredLight = "medium_light";
}

// Helper: build plant profile summary for LLM context
function buildProfileSummary(plant) {
  const profile = ensureProfile(plant);
  const images = plant.images || [];
  
  const adoptedDays = Math.floor(
    (Date.now() - new Date(profile.adoptedDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const lines = [];
  lines.push(`Nickname: ${plant.nickname || "Unknown"}`);
  lines.push(`Species: ${plant.species || "Unknown"}`);
  lines.push(`Adopted: ${adoptedDays} days ago`);
  lines.push(`Total photos: ${images.length}`);
  
  if (images.length >= 2) {
    const latest = images[images.length - 1];
    const prev = images[images.length - 2];
    if (latest.area && prev.area) {
      const growth = Math.round(((latest.area - prev.area) / prev.area) * 100);
      lines.push(`Growth since last photo: ${growth > 0 ? '+' : ''}${growth}%`);
    }
  }
  
  const health = computeHealthStatus(plant);
  lines.push(`Health Status: ${health}`);
  
  const careScore = computeCareScore(plant);
  lines.push(`Care Score: ${careScore}/100`);
  
  if (profile.userCareStyle !== "unknown") {
    lines.push(`User Care Style: ${profile.userCareStyle.replace(/_/g, ' ')}`);
  }
  if (profile.lastWatered) {
    const daysSince = Math.floor(
      (Date.now() - new Date(profile.lastWatered).getTime()) / (1000 * 60 * 60 * 24)
    );
    lines.push(`Last watered: ${daysSince} day(s) ago`);
  }
  if (profile.preferredLight !== "unknown") {
    lines.push(`Preferred Light: ${profile.preferredLight.replace(/_/g, ' ')}`);
  }
  
  return lines.join("\n");
}
```

### 1.2 Update LLM Prompts to Include Profile

In the `/reply` route (search for `const prompt = `You are a friendly houseplant`), replace the prompt building with:

```javascript
// Build richer context including plant profile
const profile = ensureProfile(plant);
updateProfileFromConversation(plant, userEntry);

const profileSummary = buildProfileSummary(plant);
const prompt = `You are a friendly houseplant${
  plant.nickname ? ` named ${plant.nickname}` : ""
} (species: ${plant.species}).

PLANT PROFILE:
${profileSummary}

CONTEXT:
${imageInfo}

CONVERSATION HISTORY (most recent first):
${recent}

USER MESSAGE: "${text}"

Respond warmly as the plant in 1-3 sentences. Reference your shared history, growth, or care when relevant. Be genuine and avoid meta-commentary.`;
```

Similarly, update the background enrichment prompt (in the upload handler) to include profile summary in the system message.

### 1.3 Add Growth Chart to Frontend

In `public/index.html`, add after the chat messages div:

```html
<div id="growthChart" style="margin-top: 20px; display: none;">
  <h4>Growth Timeline</h4>
  <canvas id="growthCanvas" width="400" height="200"></canvas>
</div>
```

Add Chart.js library to the `<head>`:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
```

Add JavaScript function to display chart:

```javascript
let growthChart = null;

function displayGrowthChart(plant) {
  const canvas = document.getElementById("growthCanvas");
  if (!canvas) return;
  
  const images = plant.images || [];
  if (images.length < 2) {
    document.getElementById("growthChart").style.display = "none";
    return;
  }
  
  const labels = images.map((img, i) => `Photo ${i + 1}`);
  const data = images.map((img) => img.area ? Math.round(img.area * 100) : 0);
  
  if (growthChart) growthChart.destroy();
  
  growthChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Green Area %",
          data,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
      },
      scales: {
        y: { min: 0, max: 100 },
      },
    },
  });
  
  document.getElementById("growthChart").style.display = "block";
}
```

Call this function after loading a plant's chat:
```javascript
// In openChat function, after loading messages:
displayGrowthChart(plant);
```

### 1.4 Add Health Status Dashboard

In `public/index.html`, add before the chat messages:

```html
<div id="healthDashboard" style="padding: 15px; background: #f5f5f5; border-radius: 8px; margin-bottom: 15px; display: none;">
  <h4 style="margin: 0 0 10px 0;">Health Overview</h4>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
    <div>
      <strong>Status:</strong>
      <span id="healthStatus" style="display: inline-block; margin-left: 5px; padding: 2px 8px; border-radius: 4px; background: #e0f2fe;">stable</span>
    </div>
    <div>
      <strong>Care Score:</strong>
      <span id="careScore">50/100</span>
    </div>
    <div>
      <strong>Days Since Watering:</strong>
      <span id="daysSinceWatering">unknown</span>
    </div>
    <div>
      <strong>Care Style:</strong>
      <span id="careStyle">unknown</span>
    </div>
  </div>
</div>
```

Add CSS for status colors (in `<style>` section):

```css
.health-thriving { background-color: #86efac !important; }
.health-stable { background-color: #e0f2fe !important; }
.health-stressed { background-color: #fecaca !important; }
```

Add JavaScript to update dashboard:

```javascript
function updateHealthDashboard(plant) {
  const profile = plant.profile || {};
  const dashboard = document.getElementById("healthDashboard");
  if (!dashboard) return;
  
  // Compute health status
  const images = plant.images || [];
  let health = "stable";
  if (images.length >= 2) {
    const latest = images[images.length - 1];
    const prev = images[images.length - 2];
    if (latest.area && prev.area) {
      const growth = (latest.area - prev.area) / Math.max(prev.area, 0.0001);
      if (growth > 0.1) health = "thriving";
      else if (growth < -0.1) health = "stressed";
    }
  }
  
  // Compute care score
  let careScore = 50;
  const careHistory = profile.careHistory || [];
  if (careHistory.length >= 5) careScore += 20;
  if (careHistory.length >= 10) careScore += 10;
  if (careHistory.length > 0) {
    const lastAction = new Date(careHistory[careHistory.length - 1].date);
    const daysSince = (Date.now() - lastAction.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 14) careScore -= 15;
  }
  careScore = Math.max(0, Math.min(100, careScore));
  
  // Update elements
  const statusEl = document.getElementById("healthStatus");
  statusEl.textContent = health;
  statusEl.className = `health-${health}`;
  
  document.getElementById("careScore").textContent = `${careScore}/100`;
  
  if (profile.lastWatered) {
    const daysSince = Math.floor(
      (Date.now() - new Date(profile.lastWatered).getTime()) / (1000 * 60 * 60 * 24)
    );
    document.getElementById("daysSinceWatering").textContent = `${daysSince} day(s) ago`;
  }
  
  if (profile.userCareStyle && profile.userCareStyle !== "unknown") {
    document.getElementById("careStyle").textContent = profile.userCareStyle.replace(/_/g, " ");
  }
  
  dashboard.style.display = "block";
}
```

Call this after loading a plant:
```javascript
// In openChat function, after loading messages:
updateHealthDashboard(plant);
```

---

## Phase 2: Enhance Interactivity

### 2.1 Side-by-Side Photo Comparison

Add modal HTML to `public/index.html`:

```html
<div id="compareModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1000; align-items: center; justify-content: center;">
  <div style="background: white; padding: 20px; border-radius: 8px; max-width: 90%; max-height: 90%; overflow-y: auto;">
    <button onclick="closeCompareModal()" style="float: right; background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
    <h3>Photo Comparison</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
      <div>
        <p id="compareLabel1" style="margin-top: 0;">Photo 1</p>
        <img id="compareImg1" style="width: 100%; border-radius: 8px; max-height: 400px; object-fit: cover;" />
        <p id="compareInfo1" style="font-size: 12px; color: #666; margin-top: 5px;"></p>
      </div>
      <div>
        <p id="compareLabel2" style="margin-top: 0;">Photo 2</p>
        <img id="compareImg2" style="width: 100%; border-radius: 8px; max-height: 400px; object-fit: cover;" />
        <p id="compareInfo2" style="font-size: 12px; color: #666; margin-top: 5px;"></p>
      </div>
    </div>
    <div id="compareGrowth" style="margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 8px; font-weight: bold;"></div>
  </div>
</div>
```

Add JavaScript functions:

```javascript
function openCompareModal(plant, idx1, idx2) {
  const images = plant.images || [];
  if (idx1 < 0 || idx1 >= images.length || idx2 < 0 || idx2 >= images.length) return;
  
  const img1 = images[idx1];
  const img2 = images[idx2];
  
  document.getElementById("compareImg1").src = `/uploads/${img1.filename}`;
  document.getElementById("compareImg2").src = `/uploads/${img2.filename}`;
  document.getElementById("compareLabel1").textContent = `Photo ${idx1 + 1} - ${new Date(img1.uploadedAt).toLocaleDateString()}`;
  document.getElementById("compareLabel2").textContent = `Photo ${idx2 + 1} - ${new Date(img2.uploadedAt).toLocaleDateString()}`;
  
  document.getElementById("compareInfo1").textContent = `Area: ${(img1.area || 0).toFixed(2) * 100}%`;
  document.getElementById("compareInfo2").textContent = `Area: ${(img2.area || 0).toFixed(2) * 100}%`;
  
  if (img1.area && img2.area) {
    const growth = Math.round(((img2.area - img1.area) / img1.area) * 100);
    document.getElementById("compareGrowth").textContent = `Growth: ${growth > 0 ? '+' : ''}${growth}%`;
  }
  
  document.getElementById("compareModal").style.display = "flex";
}

function closeCompareModal() {
  document.getElementById("compareModal").style.display = "none";
}
```

Add comparison buttons to gallery (in the gallery rendering):

```javascript
// When rendering gallery images, add compare button:
const compareBtn = document.createElement("button");
compareBtn.textContent = "Compare";
compareBtn.style.cssText = "font-size: 11px; padding: 4px 8px; margin-top: 5px;";
compareBtn.onclick = () => {
  const currentIdx = plant.images.findIndex(img => img.id === imgEl.dataset.imgId);
  if (currentIdx > 0) {
    openCompareModal(plant, currentIdx - 1, currentIdx);
  }
};
imgEl.appendChild(compareBtn);
```

### 2.2 Care Schedule Inference

Add function to `server.js` after profile helpers:

```javascript
function inferWateringSchedule(plant) {
  const profile = ensureProfile(plant);
  const careHistory = profile.careHistory || [];
  
  const wateringActions = careHistory.filter(a => a.action === "watered");
  if (wateringActions.length < 2) return null;
  
  const intervals = [];
  for (let i = 1; i < wateringActions.length; i++) {
    const prev = new Date(wateringActions[i - 1].date);
    const current = new Date(wateringActions[i].date);
    intervals.push((current - prev) / (1000 * 60 * 60 * 24));
  }
  
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const nextWatering = new Date(wateringActions[wateringActions.length - 1].date);
  nextWatering.setDate(nextWatering.getDate() + Math.ceil(avgInterval));
  
  return {
    averageIntervalDays: Math.round(avgInterval),
    nextWateringDate: nextWatering.toISOString(),
    frequency: Math.round(avgInterval) <= 3 ? "every 3 days" : Math.round(avgInterval) <= 7 ? "weekly" : "bi-weekly"
  };
}
```

Add endpoint to return care schedule:

```javascript
app.get("/plants/:id/care-schedule", (req, res) => {
  try {
    const db = readDB();
    const plant = db.plants.find(p => p.id === req.params.id);
    if (!plant) return res.status(404).json({ error: "Plant not found" });
    
    const schedule = inferWateringSchedule(plant);
    res.json({ success: true, schedule });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

### 2.3 Dark Mode Toggle

Add toggle button to `public/index.html` header:

```html
<button id="darkModeToggle" style="position: absolute; top: 10px; right: 10px; padding: 8px 12px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">🌙 Dark Mode</button>
```

Add CSS for dark mode (in `<style>`):

```css
body.dark-mode {
  background-color: #1a1a1a;
  color: #e0e0e0;
}

body.dark-mode #chatContainer,
body.dark-mode #uploadPanel {
  background-color: #2a2a2a;
  color: #e0e0e0;
  border-color: #444;
}

body.dark-mode input,
body.dark-mode textarea,
body.dark-mode select {
  background-color: #333;
  color: #e0e0e0;
  border-color: #555;
}

body.dark-mode button {
  background-color: #444;
  color: #e0e0e0;
  border-color: #666;
}

body.dark-mode .message-user,
body.dark-mode .message-plant {
  background-color: #333;
}

body.dark-mode #healthDashboard {
  background-color: #2a2a2a;
  border-color: #444;
}

body.dark-mode #compareModal {
  background-color: rgba(0, 0, 0, 0.9);
}

body.dark-mode #compareModal > div {
  background-color: #2a2a2a;
}
```

Add JavaScript to toggle dark mode:

```javascript
const darkModeToggle = document.getElementById("darkModeToggle");
const isDarkMode = localStorage.getItem("darkMode") === "true";
if (isDarkMode) {
  document.body.classList.add("dark-mode");
  darkModeToggle.textContent = "☀️ Light Mode";
}

darkModeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", isDark);
  darkModeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
});
```

---

## Phase 3: Polish & Delight

### 3.1 Voice Synthesis for Plant Replies

Add uncommented ElevenLabs to `.env`:

```
ELEVENLABS_API_KEY=sk_ea6bd0a1f404daa7b2d43a3a630e3b3e2bb669b20ac92c56
ELEVENLABS_VOICE_ID=KeVcAXy5nD528lIfYxid
```

Add voice button to messages in `public/index.html`:

```javascript
function appendMessageEl(role, text, imageId, timestamp, id) {
  // ...existing code...
  
  if (role === "plant") {
    const voiceBtn = document.createElement("button");
    voiceBtn.textContent = "🔊 Play";
    voiceBtn.style.cssText = "font-size: 11px; margin-left: 10px; padding: 4px 8px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;";
    voiceBtn.onclick = () => playPlantVoice(text);
    msgEl.appendChild(voiceBtn);
  }
  
  // ...rest of code...
}

function playPlantVoice(text) {
  const voiceId = "KeVcAXy5nD528lIfYxid";
  const apiKey = "sk_ea6bd0a1f404daa7b2d43a3a630e3b3e2bb669b20ac92c56";
  
  fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })
    .then(res => res.arrayBuffer())
    .then(buffer => {
      const audio = new Audio(URL.createObjectURL(new Blob([buffer], { type: "audio/mpeg" })));
      audio.play();
    })
    .catch(err => console.error("Voice playback failed:", err));
}
```

### 3.2 Milestone Celebrations

Add function to detect milestones:

```javascript
function checkMilestones(plant) {
  const profile = ensureProfile(plant);
  const adoptedDate = new Date(profile.adoptedDate);
  const daysOld = (Date.now() - adoptedDate.getTime()) / (1000 * 60 * 60 * 24);
  
  const milestones = [];
  if (daysOld >= 7 && !profile.milestones.oneWeek) {
    milestones.push({ name: "1 Week Together!", emoji: "🎉", days: 7 });
    profile.milestones.oneWeek = true;
  }
  if (daysOld >= 30 && !profile.milestones.oneMonth) {
    milestones.push({ name: "1 Month Together!", emoji: "🎊", days: 30 });
    profile.milestones.oneMonth = true;
  }
  if (daysOld >= 180 && !profile.milestones.sixMonths) {
    milestones.push({ name: "6 Months Together!", emoji: "🌟", days: 180 });
    profile.milestones.sixMonths = true;
  }
  if (daysOld >= 365 && !profile.milestones.oneYear) {
    milestones.push({ name: "1 Year Together!", emoji: "🏆", days: 365 });
    profile.milestones.oneYear = true;
  }
  
  return milestones;
}

function displayMilestones(plant) {
  const milestones = checkMilestones(plant);
  if (milestones.length === 0) return;
  
  const messagesDiv = document.getElementById("chatMessages");
  for (const milestone of milestones) {
    const mEl = document.createElement("div");
    mEl.style.cssText = "text-align: center; padding: 15px; background: linear-gradient(135deg, #ffd700, #ffed4e); border-radius: 8px; margin: 10px 0; font-weight: bold;";
    mEl.innerHTML = `<div style="font-size: 32px;">${milestone.emoji}</div><div>${milestone.name}</div>`;
    messagesDiv.appendChild(mEl);
  }
}
```

### 3.3 Multi-Plant Analytics Dashboard

Add new route to `server.js`:

```javascript
app.get("/analytics/plants", (req, res) => {
  try {
    const db = readDB();
    const plants = db.plants || [];
    
    const analytics = plants.map(p => {
      const profile = ensureProfile(p);
      const images = p.images || [];
      let latestGrowth = null;
      
      if (images.length >= 2) {
        const latest = images[images.length - 1];
        const prev = images[images.length - 2];
        if (latest.area && prev.area) {
          latestGrowth = Math.round(((latest.area - prev.area) / prev.area) * 100);
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
        adoptedDays: Math.floor((Date.now() - new Date(profile.adoptedDate).getTime()) / (1000 * 60 * 60 * 24)),
      };
    });
    
    res.json({ success: true, analytics });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

Add analytics page to frontend (new tab or section):

```html
<div id="analyticsContainer" style="display: none; padding: 20px;">
  <h2>All Plants Analytics</h2>
  <div id="analyticsList" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;"></div>
</div>
```

Add function to load and display analytics:

```javascript
function loadAnalytics() {
  fetch("/analytics/plants")
    .then(r => r.json())
    .then(data => {
      const list = document.getElementById("analyticsList");
      list.innerHTML = "";
      
      const sorted = data.analytics.sort((a, b) => (b.careScore || 0) - (a.careScore || 0));
      
      sorted.forEach((p, i) => {
        const card = document.createElement("div");
        card.style.cssText = "padding: 15px; background: #f9f9f9; border-radius: 8px; border: 1px solid #ddd;";
        card.innerHTML = `
          <h4 style="margin: 0;">${p.nickname}</h4>
          <p style="font-size: 12px; color: #666; margin: 5px 0;">${p.species}</p>
          <div style="font-size: 13px; line-height: 1.6;">
            <div>📷 Photos: ${p.totalPhotos}</div>
            <div>📈 Latest Growth: ${p.latestGrowth ? (p.latestGrowth > 0 ? '+' : '') + p.latestGrowth + '%' : 'N/A'}</div>
            <div>💚 Status: ${p.healthStatus}</div>
            <div>⭐ Care Score: ${p.careScore}/100</div>
            <div>📅 Adopted: ${p.adoptedDays} days ago</div>
          </div>
          <div style="margin-top: 10px; font-weight: bold; ${i === 0 ? 'color: gold;' : ''}">${i === 0 ? '🏆 Best Cared For!' : i === 1 ? '🥈 Second Best' : ''}</div>
        `;
        list.appendChild(card);
      });
    });
}
```

---

## Summary of All Changes

### Backend (server.js):
- ✅ Add profile helper functions
- ✅ Update /reply prompt to include profile
- ✅ Add care schedule inference
- ✅ Add analytics endpoint
- ✅ Extract care facts from conversations

### Frontend (public/index.html):
- ✅ Add Chart.js library
- ✅ Add growth chart visualization
- ✅ Add health status dashboard
- ✅ Add side-by-side comparison modal
- ✅ Add dark mode toggle
- ✅ Add voice synthesis buttons
- ✅ Add milestone celebrations
- ✅ Add analytics dashboard

### Database (data/db.json):
- ✅ Each plant now has a `profile` object that persists automatically

---

## Testing Checklist

After implementation, test:
- [ ] Upload a plant photo and verify profile is created
- [ ] Chat with plant and verify care facts are extracted
- [ ] Check growth chart displays correctly
- [ ] Toggle health status (watering triggers care score updates)
- [ ] Compare two photos side-by-side
- [ ] Toggle dark mode and verify persistence
- [ ] Click voice button on plant reply and hear it speak
- [ ] Wait for milestones (or manually test with adoption date)
- [ ] View analytics dashboard across all plants
- [ ] Verify care schedule inference works

