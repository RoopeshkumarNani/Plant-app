-- Supabase Database Schema for Plant App
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Plants table
CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species TEXT,
  nickname TEXT,
  owner TEXT DEFAULT 'mother',
  adopted_date TIMESTAMPTZ,
  health_status TEXT DEFAULT 'stable',
  care_score INTEGER DEFAULT 50,
  user_care_style TEXT,
  preferred_light TEXT,
  watering_frequency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flowers table
CREATE TABLE IF NOT EXISTS flowers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species TEXT,
  nickname TEXT,
  owner TEXT DEFAULT 'mother',
  adopted_date TIMESTAMPTZ,
  health_status TEXT DEFAULT 'stable',
  care_score INTEGER DEFAULT 50,
  user_care_style TEXT,
  preferred_light TEXT,
  watering_frequency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Images table
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
  flower_id UUID REFERENCES flowers(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  supabase_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  area DECIMAL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  CONSTRAINT check_plant_or_flower CHECK (
    (plant_id IS NOT NULL AND flower_id IS NULL) OR 
    (plant_id IS NULL AND flower_id IS NOT NULL)
  )
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
  flower_id UUID REFERENCES flowers(id) ON DELETE CASCADE,
  image_id UUID REFERENCES images(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'plant')),
  text TEXT NOT NULL,
  text_en TEXT,
  text_kn TEXT,
  time TIMESTAMPTZ DEFAULT NOW(),
  growth_delta DECIMAL,
  CONSTRAINT check_plant_or_flower_conv CHECK (
    (plant_id IS NOT NULL AND flower_id IS NULL) OR 
    (plant_id IS NULL AND flower_id IS NOT NULL)
  )
);

-- Care history table (for detailed care tracking)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_images_plant_id ON images(plant_id);
CREATE INDEX IF NOT EXISTS idx_images_flower_id ON images(flower_id);
CREATE INDEX IF NOT EXISTS idx_conversations_plant_id ON conversations(plant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_flower_id ON conversations(flower_id);
CREATE INDEX IF NOT EXISTS idx_conversations_image_id ON conversations(image_id);
CREATE INDEX IF NOT EXISTS idx_care_history_plant_id ON care_history(plant_id);
CREATE INDEX IF NOT EXISTS idx_care_history_flower_id ON care_history(flower_id);
CREATE INDEX IF NOT EXISTS idx_plants_owner ON plants(owner);
CREATE INDEX IF NOT EXISTS idx_flowers_owner ON flowers(owner);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_plants_updated_at BEFORE UPDATE ON plants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flowers_updated_at BEFORE UPDATE ON flowers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket policies (run after creating bucket in Supabase Dashboard)
-- These are set via Supabase Dashboard, but documented here:
-- 1. Create bucket named 'images' in Storage
-- 2. Make it public
-- 3. Set policy: "Public Access" for SELECT (read)
-- 4. Set policy: "Authenticated Upload" for INSERT (upload) - or use service role key

