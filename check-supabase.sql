-- ============================================
-- SUPABASE DIAGNOSTIC QUERIES
-- Copy and paste these in Supabase SQL Editor
-- Then paste the results here so I can guide you
-- ============================================

-- 1. Check what tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check if our required tables exist
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plants') THEN '✅ EXISTS' ELSE '❌ MISSING' END as plants_table,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'flowers') THEN '✅ EXISTS' ELSE '❌ MISSING' END as flowers_table,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'images') THEN '✅ EXISTS' ELSE '❌ MISSING' END as images_table,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN '✅ EXISTS' ELSE '❌ MISSING' END as conversations_table,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'care_history') THEN '✅ EXISTS' ELSE '❌ MISSING' END as care_history_table;

-- 3. Check table structures (if tables exist)
-- Run this for each table that exists:

-- For plants table:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'plants' AND table_schema = 'public'
ORDER BY ordinal_position;

-- For flowers table:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'flowers' AND table_schema = 'public'
ORDER BY ordinal_position;

-- For images table:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'images' AND table_schema = 'public'
ORDER BY ordinal_position;

-- For conversations table:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'conversations' AND table_schema = 'public'
ORDER BY ordinal_position;

-- For care_history table:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'care_history' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('plants', 'flowers', 'images', 'conversations', 'care_history')
ORDER BY tablename, indexname;

-- 5. Check storage buckets (this requires a different query - see note below)
-- Note: Storage buckets are checked via Supabase Dashboard → Storage, not SQL
-- But you can check policies:
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- 6. Check if UUID extension is enabled
SELECT 
    extname,
    extversion
FROM pg_extension
WHERE extname = 'uuid-ossp';

-- 7. Count records in each table (if they exist)
SELECT 
    'plants' as table_name,
    COUNT(*) as record_count
FROM plants
UNION ALL
SELECT 
    'flowers' as table_name,
    COUNT(*) as record_count
FROM flowers
UNION ALL
SELECT 
    'images' as table_name,
    COUNT(*) as record_count
FROM images
UNION ALL
SELECT 
    'conversations' as table_name,
    COUNT(*) as record_count
FROM conversations
UNION ALL
SELECT 
    'care_history' as table_name,
    COUNT(*) as record_count
FROM care_history;

