-- ============================================
-- DELETE ALL DATA FROM SUPABASE
-- Run this in Supabase SQL Editor to clean everything
-- ============================================

-- WARNING: This will delete ALL data from all tables!
-- Make sure you want to do this before running!

-- Delete in correct order (respecting foreign keys)
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

-- Should all return 0

