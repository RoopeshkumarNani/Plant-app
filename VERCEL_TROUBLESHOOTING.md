# Vercel Deployment Troubleshooting Guide

## Current Status
✅ Code pushed to GitHub with fixes for:
- Firebase initialization errors
- Serverless function export
- Proper private key parsing
- Safe database reference handling

Vercel will auto-redeploy. Check deployment progress at:
https://vercel.com/dashboard/plant-app-sigma/deployments

## If You Still See 500 Error

### Step 1: Check Vercel Logs
1. Go to: https://vercel.com/dashboard
2. Select project: **plant-app-sigma**
3. Click **Deployments** tab
4. Click the latest deployment (top one)
5. Click **Functions** 
6. Click **server.js**
7. Scroll to see all logs

### Step 2: Look for These Messages

✅ **GOOD** - You'll see these:
```
🔧 Initializing Firebase Admin SDK...
  - Project ID: my-soulmates
  - Client Email: firebase-adminsdk-fbsvc@my-soulmates.iam.gserviceaccount.com
  - Private Key ID: c34fa7f23e226c9815b706fb6756aaf3df14304a
✅ Firebase Admin SDK initialized with URL: https://my-soulmates-default-rtdb.firebaseio.com
✅ Firebase Realtime Database reference created
✅ Firebase Storage bucket initialized
📍 Bucket name: my-soulmates.appspot.com
✅ Supabase client initialized
```

❌ **BAD** - If you see these, there's a problem:
```
❌ Firebase initialization failed: [error message]
```

### Step 3: Most Likely Issue - Private Key Format

**Problem**: The FIREBASE_PRIVATE_KEY environment variable is in the wrong format.

**Solution**: The private key needs to be entered in Vercel with **actual newlines**, not the text `\n`.

#### How to Fix It:

1. **Get the correct private key format:**
   - Open your Firebase JSON file: `~/Downloads/my-soulmates-firebase-adminsdk-fbsvc-*.json`
   - Find the `private_key` value
   - It should look like:
   ```
   -----BEGIN PRIVATE KEY-----
   [many lines of base64]
   -----END PRIVATE KEY-----
   ```

2. **In Vercel Dashboard:**
   - Go to Settings → Environment Variables
   - Find `FIREBASE_PRIVATE_KEY`
   - **DELETE** the existing value
   - Paste the entire private key (with real line breaks)
     - When you paste a multi-line value, it should show multiple lines in the editor
     - NOT showing as `\n` text
   - **Important**: Some editors will auto-escape the newlines. Make sure they're actual newlines.
   - Click **Save**

3. **Trigger a redeployment:**
   - Go to Deployments
   - Click the "..." menu on your latest deployment
   - Select "Redeploy"
   - Wait 2-3 minutes

### Step 4: Alternative - Verify Environment Variables Are Set

In Vercel Settings → Environment Variables, you should have these 5 variables:

1. ✅ `FIREBASE_PROJECT_ID` = `my-soulmates`
2. ✅ `FIREBASE_PRIVATE_KEY_ID` = `c34fa7f23e226c9815b706fb6756aaf3df14304a`
3. ✅ `FIREBASE_CLIENT_EMAIL` = `firebase-adminsdk-fbsvc@my-soulmates.iam.gserviceaccount.com`
4. ✅ `FIREBASE_CLIENT_ID` = `110143004379709851929`
5. ✅ `FIREBASE_PRIVATE_KEY` = [the full RSA private key with actual newlines]

If any are missing, add them again.

## If Still Not Working

### Check the Firebase Service Account JSON File

Verify your Firebase credentials are correct:

```bash
cat ~/Downloads/my-soulmates-firebase-adminsdk-fbsvc-*.json | grep -E "project_id|client_email|private_key_id"
```

Should show:
- `"project_id": "my-soulmates"`
- `"client_email": "firebase-adminsdk-fbsvc@my-soulmates.iam.gserviceaccount.com"`
- `"private_key_id": "c34fa7f23e226c9815b706fb6756aaf3df14304a"`

### Test Firebase Locally

Add this to `.env` file locally and test:
```
FIREBASE_PROJECT_ID=my-soulmates
FIREBASE_PRIVATE_KEY_ID=c34fa7f23e226c9815b706fb6756aaf3df14304a
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@my-soulmates.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=110143004379709851929
FIREBASE_PRIVATE_KEY=[paste the full private key - copy from JSON file]
```

Then run locally:
```bash
npm start
```

If it works locally but not on Vercel, the issue is with how the private key was pasted into Vercel.

## Success Criteria

Once working, you should see:
1. ✅ No 500 errors
2. ✅ Upload an image → get success message with Firebase URL
3. ✅ Image displays in gallery
4. ✅ Image persists after page refresh
5. ✅ Delete image works

## Contact Firebase Support

If you're still having issues, check:
- https://firebase.google.com/docs/admin/setup
- Make sure the service account has Storage permissions in Firebase Console
