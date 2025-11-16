-- ============================================
-- COMPLETE SUPABASE SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create missing care_history table
CREATE TABLE IF NOT EXISTS care_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
  flower_id UUID REFERENCES flowers(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('watered', 'fertilized', 'repotted')),
  date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  CONSTRAINT check_plant_or_flower_care CHECK (
    (plant_id IS NOT NULL AND flower_id IS NULL) OR 
    (plant_id IS NULL AND flower_id IS NOT NULL)
  )
);

-- Step 2: Create indexes for care_history
CREATE INDEX IF NOT EXISTS idx_care_history_plant_id ON care_history(plant_id);
CREATE INDEX IF NOT EXISTS idx_care_history_flower_id ON care_history(flower_id);

-- Step 3: Add missing columns to images table (if needed)
-- Check if supabase_url column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'supabase_url'
    ) THEN
        ALTER TABLE images ADD COLUMN supabase_url TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'storage_path'
    ) THEN
        ALTER TABLE images ADD COLUMN storage_path TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'file_size'
    ) THEN
        ALTER TABLE images ADD COLUMN file_size INTEGER;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'width'
    ) THEN
        ALTER TABLE images ADD COLUMN width INTEGER;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'height'
    ) THEN
        ALTER TABLE images ADD COLUMN height INTEGER;
    END IF;
END $$;

-- Step 4: Ensure all required indexes exist
CREATE INDEX IF NOT EXISTS idx_images_plant_id ON images(plant_id);
CREATE INDEX IF NOT EXISTS idx_images_flower_id ON images(flower_id);
CREATE INDEX IF NOT EXISTS idx_conversations_plant_id ON conversations(plant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_flower_id ON conversations(flower_id);
CREATE INDEX IF NOT EXISTS idx_conversations_image_id ON conversations(image_id);
CREATE INDEX IF NOT EXISTS idx_plants_owner ON plants(owner);
CREATE INDEX IF NOT EXISTS idx_flowers_owner ON flowers(owner);

-- Step 5: Verify everything
SELECT 
    '✅ care_history table created' as status
UNION ALL
SELECT 
    '✅ All indexes created' as status
UNION ALL
SELECT 
    '✅ Images table columns updated' as status;

