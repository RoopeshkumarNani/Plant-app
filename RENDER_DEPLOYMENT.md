# Render.com + Firebase Hosting Deployment Guide

## Overview

- **Backend**: Deploy Node.js app to Render.com (FREE)
- **Frontend**: Deploy to Firebase Hosting (FREE)
- **Database**: Use included db.json file (auto-uploaded)

---

## Step 1: Deploy Backend to Render.com

### Prerequisites

- GitHub account (✅ you have this)
- Render.com account (create free at https://render.com)

### Steps

1. **Create Render.com Account**

   - Go to https://render.com
   - Sign up with GitHub (easiest option)
   - Authorize Render to access your GitHub

2. **Deploy the Backend Service**

   - Click "Create +" → "Web Service"
   - Connect your GitHub repo: `Plant-app`
   - Select branch: `main`
   - Configure:
     - **Name**: `plant-app-backend`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `node server.js`
     - **Instance Type**: `Free`

3. **Add Environment Variables**

   - In Render dashboard, go to your service
   - Click "Environment" tab
   - Add these variables:
     ```
     OPENAI_API_KEY=sk-proj-xxxxx... (your key)
     PLANTNET_API_KEY=2b10GjSeLANV... (your key)
     NODE_ENV=production
     PORT=10000
     ```

4. **Complete Deployment**
   - Render will automatically deploy
   - Wait for "Your service is live" message
   - Copy the service URL (e.g., `https://plant-app-backend-xxxx.onrender.com`)

---

## Step 2: Update Frontend with Backend URL

1. **Update `public/config.js`**

   Replace:

   ```javascript
   const API_BASE_URL =
     typeof window !== "undefined" && window.location.hostname === "localhost"
       ? "http://localhost:3000"
       : "";
   ```

   With:

   ```javascript
   const API_BASE_URL = "https://plant-app-backend-xxxx.onrender.com";
   ```

   (Replace `xxxx` with your actual Render service name)

2. **Commit and Push to GitHub**
   ```bash
   git add public/config.js
   git commit -m "Update backend URL for Render deployment"
   git push origin main
   ```

---

## Step 3: Deploy Frontend to Firebase Hosting

### Important: Fix Firebase Configuration First

Since Cloud Functions requires paid plan, we need to remove the functions config:

1. **Update firebase.json**

   Replace the entire file with:

   ```json
   {
     "hosting": {
       "public": "public",
       "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
       "headers": [
         {
           "source": "**",
           "headers": [
             {
               "key": "Access-Control-Allow-Origin",
               "value": "*"
             }
           ]
         }
       ]
     }
   }
   ```

2. **Delete the functions folder** (optional, to avoid confusion)

   ```bash
   rm -r functions
   ```

3. **Commit Changes**

   ```bash
   git add firebase.json
   git commit -m "Update Firebase config for hosting-only deployment"
   git push origin main
   ```

4. **Deploy Frontend**

   ```bash
   firebase deploy --only hosting
   ```

5. **Get Your Firebase URL**
   - Firebase will show: `Hosting URL: https://my-soulmates.web.app`
   - Or check: `firebase open hosting:site`

---

## Step 4: Verify Everything Works

Test your live app:

1. **Visit Firebase URL**: `https://my-soulmates.web.app`
2. **Test Features**:

   - ✅ Upload a plant/flower
   - ✅ Chat with plant (test both English & Kannada)
   - ✅ Filter by owner (Amma/Ammulu)
   - ✅ Check browser console (F12) for any errors

3. **If API Calls Fail**:
   - Check Render logs: Dashboard → Service → Logs
   - Verify `public/config.js` has correct backend URL
   - Ensure environment variables are set in Render

---

## Cost Breakdown (100% FREE) ✨

| Service              | Free Tier                            | Your Usage   |
| -------------------- | ------------------------------------ | ------------ |
| **Render.com**       | 0.5 GB RAM, 500 build hours/month    | ✅ Enough    |
| **Firebase Hosting** | 10GB bandwidth/month, 1GB storage    | ✅ Enough    |
| **GitHub**           | Unlimited repos, unlimited bandwidth | ✅ Included  |
| **TOTAL**            | **$0/month**                         | **$0/month** |

---

## Troubleshooting

### App Shows "Cannot reach backend"

- ✅ Check Render service is deployed and running
- ✅ Verify `public/config.js` has correct backend URL
- ✅ Wait 1-2 minutes after Render deployment (it's starting up)

### Voice/Audio Not Working

- Open browser console (F12 → Console tab)
- Check for error messages
- This is a known issue we'll debug later

### Images Not Loading

- Check browser Network tab (F12 → Network)
- Verify upload folder is included in deployment
- Render automatically includes the `data/` folder

### Database Changes Not Persistent

- Note: Render free tier resets every 7 days
- For production, migrate to Firestore (future enhancement)
- For now, uploads are temporary

---

## Quick Command Reference

```bash
# Check Render logs (view in browser: Render dashboard)
# View Firebase hosting URL
firebase open hosting:site

# View Firebase Hosting logs
firebase hosting:channel:list

# Redeploy frontend
firebase deploy --only hosting

# Push to GitHub (auto-triggers Render redeploy)
git push origin main
```

---

## Next Steps (Optional)

1. **Custom Domain** (future)

   - Add your own domain to Firebase Hosting
   - Upgrade Render to custom domain

2. **Firestore Migration** (future)

   - Replace file-based db.json with Firestore
   - Persistent data across redeploys

3. **Auto-Deploy on Git Push**
   - Already enabled! Push to GitHub = auto-deploy to Render

---

## Support Resources

- **Render.com Docs**: https://render.com/docs
- **Firebase Hosting**: https://firebase.google.com/docs/hosting
- **GitHub**: https://github.com/RoopeshkumarNani/Plant-app

**You're all set! Happy planting! 🌿**
