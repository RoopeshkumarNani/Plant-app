# 🚀 Quick Setup Guide - Supabase Migration

## ⚡ Fast Track (5 Minutes)

### Step 1: Run SQL Schema (2 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Run the Schema**
   - Open `supabase-schema.sql` file in this project
   - Copy ALL the SQL code
   - Paste into SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Verify**
   - You should see: "Success. No rows returned"
   - Check "Table Editor" → You should see: `plants`, `flowers`, `images`, `conversations`, `care_history`

### Step 2: Create Storage Bucket (1 minute)

1. **Go to Storage**
   - Click "Storage" in left sidebar
   - Click "Buckets"

2. **Create Bucket**
   - Click "Create bucket" button
   - Name: `images`
   - ✅ Check "Public bucket"
   - Click "Create"

3. **Set Policies** (in SQL Editor)
   ```sql
   -- Allow public read access
   CREATE POLICY "Public Access" ON storage.objects
   FOR SELECT USING (bucket_id = 'images');
   
   -- Allow authenticated uploads
   CREATE POLICY "Authenticated Upload" ON storage.objects
   FOR INSERT WITH CHECK (bucket_id = 'images');
   ```
   Click "Run"

### Step 3: Get Service Role Key (1 minute)

1. **Go to Settings**
   - Click "Settings" (gear icon)
   - Click "API"

2. **Copy Service Role Key**
   - Find "service_role" key (NOT the anon key!)
   - Click "Reveal" and copy it
   - ⚠️ Keep this secret - it has admin access!

### Step 4: Update Render Environment Variables (1 minute)

1. **Go to Render Dashboard**
   - https://dashboard.render.com/web/srv-d4c9t41r0fns738773e0/
   - Click "Environment" tab

2. **Add/Update Variables**
   - Click "Add Environment Variable"
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (paste the service role key from Step 3)
   - Click "Save Changes"

3. **Remove Firebase Variables** (if present)
   - Delete: `FIREBASE_PROJECT_ID`
   - Delete: `FIREBASE_PRIVATE_KEY`
   - Delete: `FIREBASE_CLIENT_EMAIL`
   - Delete: `FIREBASE_PRIVATE_KEY_ID`
   - Delete: `FIREBASE_CLIENT_ID`

4. **Verify Existing Variables**
   - ✅ `SUPABASE_URL` should be set
   - ✅ `SUPABASE_ANON_KEY` should be set
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` should be set (NEW)
   - ✅ `OPENAI_API_KEY` should be set
   - ✅ `PLANTNET_API_KEY` should be set (optional)

### Step 5: Deploy (automatic)

1. **Commit and Push**
   ```bash
   git add .
   git commit -m "Complete Supabase migration"
   git push origin main
   ```

2. **Wait for Render**
   - Render will auto-deploy (2-3 minutes)
   - Check logs for: "✅ Supabase client initialized"

### Step 6: Test (1 minute)

1. **Check Status**
   ```
   https://plant-app-backend-h28h.onrender.com/admin/supabase-status
   ```
   Should show: `"status": "✅ Ready"`

2. **Test Upload**
   - Go to: https://my-soulmates.web.app/
   - Upload a plant photo
   - Check Supabase Storage → images bucket
   - Verify image appears (should be ~90KB compressed)

3. **Test Database**
   - Check Supabase → Table Editor → plants
   - Verify new plant record exists

## ✅ Done!

Your app is now:
- ✅ 100% Free
- ✅ Supports 11,000+ images
- ✅ Using Supabase only
- ✅ All features working

## 🆘 Troubleshooting

### "relation 'plants' does not exist"
→ Run the SQL schema in Supabase SQL Editor

### "bucket 'images' does not exist"
→ Create the storage bucket in Supabase Dashboard

### "Invalid API key"
→ Check SUPABASE_SERVICE_ROLE_KEY is correct (not anon key!)

### Images not uploading
→ Check storage bucket is public and policies are set

### Status shows "⚠️ Issues detected"
→ Check the error messages in the status response

## 📞 Need Help?

Check these files:
- `SUPABASE_MIGRATION_COMPLETE.md` - Full details
- `supabase-schema.sql` - Database schema
- `setup-supabase.js` - Automated setup script

