-- ============================================
-- FIX MISSING TABLE: care_history
-- Run this in Supabase SQL Editor
-- ============================================

-- Create care_history table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_care_history_plant_id ON care_history(plant_id);
CREATE INDEX IF NOT EXISTS idx_care_history_flower_id ON care_history(flower_id);

-- Verify it was created
SELECT '✅ care_history table created successfully!' as status;

