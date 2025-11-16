-- ============================================
-- CHECK STORAGE POLICIES
-- Run this to see what storage policies exist
-- ============================================

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

