# 🗑️ Complete Data Cleanup Guide

## Problem: Broken Images Showing Empty Frames

You're seeing image placeholders without content because:
- Old database entries point to deleted Firebase Storage files
- Local `/uploads/` files were deleted
- Supabase Storage has orphaned files

## Solution: Complete Cleanup

### Option 1: Use API Endpoint (Recommended)

**After Render deploys (wait 2-3 minutes), run:**

```bash
# If you have INVITE_TOKEN set in Render:
curl -X POST https://plant-app-backend-h28h.onrender.com/admin/clear-all \
  -H "x-invite-token: YOUR_TOKEN"

# If you DON'T have INVITE_TOKEN:
curl -X POST https://plant-app-backend-h28h.onrender.com/admin/clear-all
```

This will:
- ✅ Delete all Supabase database records
- ✅ Delete all Supabase Storage files (recursively)
- ✅ Delete all Firebase Storage files (if exists)
- ✅ Delete all local upload files
- ✅ Reset local db.json

### Option 2: Manual Cleanup (If API doesn't work)

#### Step 1: Clear Supabase Database

1. Go to: https://supabase.com/dashboard/project/yvpoabomcnwegjvfwtav/editor
2. Click **SQL Editor**
3. Run this:

```sql
-- Delete all data (in correct order)
DELETE FROM care_history;
DELETE FROM conversations;
DELETE FROM images;
DELETE FROM flowers;
DELETE FROM plants;

-- Verify everything is deleted
SELECT 
    (SELECT COUNT(*) FROM plants) as plants_count,
    (SELECT COUNT(*) FROM flowers) as flowers_count,
    (SELECT COUNT(*) FROM images) as images_count,
    (SELECT COUNT(*) FROM conversations) as conversations_count,
    (SELECT COUNT(*) FROM care_history) as care_history_count;
```

#### Step 2: Clear Supabase Storage

1. Go to: https://supabase.com/dashboard/project/yvpoabomcnwegjvfwtav/storage/buckets
2. Click **`images`** bucket
3. Select **ALL files** (check the top checkbox)
4. Click **Delete** button
5. Confirm deletion

#### Step 3: Clear Firebase Storage (if you still have it)

1. Go to: https://console.firebase.google.com/project/my-soulmates/storage
2. Navigate to Storage
3. Delete all files manually

#### Step 4: Clear Browser Cache

1. Open your app: https://my-soulmates.web.app/
2. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
3. Select "Cached images and files"
4. Click "Clear data"
5. Refresh the page (`Ctrl+Shift+R` or `Cmd+Shift+R`)

## After Cleanup

1. **Wait for Render to deploy** (2-3 minutes)
2. **Refresh your app** (hard refresh: `Ctrl+Shift+R`)
3. **Upload a new image** to test:
   - Select an owner
   - Upload a white rose (should go to Flowers section)
   - Should work perfectly!

## What Changed

✅ **Improved cleanup endpoint** - Now recursively deletes all Supabase Storage files
✅ **Better image error handling** - Broken images show placeholder instead of empty frames
✅ **Supabase URL support** - Frontend now checks for Supabase Storage URLs first

## Verify Cleanup Worked

After cleanup, check:

1. **Supabase Database**: Should show 0 records in all tables
2. **Supabase Storage**: Should be empty
3. **Your App**: Should show "No plants yet" message
4. **Browser Console**: No image loading errors

Then upload fresh images and they should work perfectly! 🌸

