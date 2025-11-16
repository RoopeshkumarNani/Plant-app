-- ============================================
-- VERIFY TABLE STRUCTURES
-- Run this to check if your tables have all required columns
-- ============================================

-- Check plants table structure
SELECT 
    'plants' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'plants' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check flowers table structure
SELECT 
    'flowers' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'flowers' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check images table structure
SELECT 
    'images' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'images' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check conversations table structure
SELECT 
    'conversations' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'conversations' AND table_schema = 'public'
ORDER BY ordinal_position;

