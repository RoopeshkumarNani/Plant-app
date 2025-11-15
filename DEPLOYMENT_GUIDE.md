# Firebase + Cloud Run Deployment Guide

## Prerequisites

1. Google Cloud SDK installed: https://cloud.google.com/sdk/docs/install
2. Firebase CLI installed: ✅ (already done)
3. Docker installed: https://www.docker.com/products/docker-desktop
4. Firebase project created: ✅ my-soulmates (already done)

## Step 1: Initialize Google Cloud Project

```bash
gcloud init
# Select your Google account
# Select project: my-soulmates
```

## Step 2: Configure Project Settings

```bash
gcloud config set project my-soulmates
```

## Step 3: Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## Step 4: Create .env File

Create a `.env` file in the project root with your API keys:

```env
OPENAI_API_KEY=your_openai_key_here
PLANTNET_API_KEY=your_plantnet_key_here
```

Note: These will be securely passed to Cloud Run as environment variables.

## Step 5: Deploy Backend to Cloud Run

```bash
# Build and deploy to Cloud Run
gcloud run deploy plant-app-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="OPENAI_API_KEY=your_openai_key,PLANTNET_API_KEY=your_plantnet_key"
```

This will output a URL like: `https://plant-app-backend-xxxxxx.run.app`

## Step 6: Update Frontend with Backend URL

After Cloud Run deployment, update `public/index.html`:

Find the API base URL (currently likely `http://localhost:3000`) and replace with your Cloud Run URL.

Search for any hardcoded API calls and update them:

- Replace `http://localhost:3000` with your Cloud Run service URL
- Example: `https://plant-app-backend-xxxxxx.run.app`

## Step 7: Deploy Frontend to Firebase Hosting

```bash
firebase deploy --only hosting
```

This will deploy your `public/` folder to Firebase Hosting.

## Step 8: Verify Deployment

After deployment:

1. Visit your Firebase Hosting URL (provided by firebase deploy)
2. Test all features:
   - Upload plants/flowers
   - Chat functionality
   - Owner filtering (Amma/Ammulu)
   - Language toggle (English/Kannada)
   - Voice button (check console for errors if not working)

## Troubleshooting

### Voice/Audio Not Working

Check browser console (F12 → Console tab) for errors. Common issues:

- CORS errors: May need to enable CORS in server.js
- Missing TTS service: Verify OpenAI key is valid
- Browser restrictions: Some browsers restrict audio on non-HTTPS (but Firebase Hosting uses HTTPS)

### API Calls Failing

- Verify Cloud Run URL is correct in your frontend
- Check Cloud Run logs: `gcloud run logs read plant-app-backend --limit 50`
- Ensure environment variables are set in Cloud Run

### Database Issues

- Your `data/db.json` is copied into the container
- For persistent data, consider migrating to Firebase Firestore (optional)
- For now, uploads will persist within the container lifetime

## Optional: Set Up Automatic Deployment

After initial setup, you can configure GitHub integration:

```bash
firebase init hosting:github
```

This will auto-deploy when you push to GitHub.

## Cost Estimate (Free Tier)

- **Firebase Hosting**: 1GB storage, 10GB/month bandwidth (FREE)
- **Cloud Run**: 2 million requests/month, 360,000 GB-seconds/month (FREE)
- **Total**: FREE for reasonable usage!

## Quick Commands Reference

```bash
# View Cloud Run logs
gcloud run logs read plant-app-backend --limit 100

# Get Cloud Run service URL
gcloud run services describe plant-app-backend --region us-central1

# Redeploy backend
gcloud run deploy plant-app-backend --source . --platform managed --region us-central1

# Redeploy frontend
firebase deploy --only hosting

# View Firebase hosting URL
firebase open hosting:site
```

## Notes

- Cloud Run automatically restarts on error
- Your db.json file is included but is read-only in container
- For production, consider using Firestore instead of file-based storage
- Free tier is generous for personal/hobby projects
