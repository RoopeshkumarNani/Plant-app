# How to Manually Redeploy on Vercel

Since auto-deployment from GitHub might not be configured, follow these steps to manually trigger a redeploy:

## Option 1: Vercel Dashboard (Easiest)

1. Go to: https://vercel.com/dashboard
2. Click on your project: **plant-app-sigma**
3. Go to the **Deployments** tab
4. Find your latest deployment (should show the commit message "Add deployment version tracker...")
5. Click the **...** (three dots) menu on that deployment
6. Select **"Redeploy"**
7. Wait 2-3 minutes for the deployment to complete
8. Once deployed, check the logs to see if you see: "🚀 Plant App starting - Version: 2025-11-29-fixed-vercel-fs"

## Option 2: Vercel CLI (If you have it installed)

```bash
vercel --prod
```

## Option 3: Check GitHub Integration

If auto-deploy still doesn't work:

1. Go to: https://vercel.com/dashboard
2. Click your project: **plant-app-sigma**
3. Go to **Settings** → **Git Integration**
4. Make sure GitHub is connected and auto-deployment is enabled
5. If not enabled, click **"Configure"** and follow the prompts

## What Changed

The latest code fix:
- ✅ Wraps filesystem operations in try-catch
- ✅ Checks for `process.env.VERCEL` before trying to create directories
- ✅ Prevents the 500 error from `mkdir '/var/task/uploads'`
- ✅ Exports the Express app for Vercel serverless
- ✅ Handles Firebase initialization with proper error handling

## Expected Result After Redeployment

Once deployed with the fixes:
1. ✅ No more 500 errors from filesystem operations
2. ✅ App should start successfully
3. ✅ Firebase/Supabase should handle all data
4. ✅ Image uploads should work to Firebase Storage

## How to Verify It Worked

After redeployment, check the Vercel function logs for:
```
🚀 Plant App starting - Version: 2025-11-29-fixed-vercel-fs
ℹ️  Running on Vercel - skipping filesystem operations
✅ Firebase Admin SDK already initialized
✅ Firebase Storage bucket initialized
✅ Supabase client initialized
```

If you see any of these messages, the new code is running!
