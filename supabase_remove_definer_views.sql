-- ============================================
-- DEFINITIVE FIX: Remove SECURITY DEFINER Views
-- ============================================
-- This script PERMANENTLY removes the problematic views
-- that cause SECURITY DEFINER warnings.
--
-- Run this script in Supabase SQL Editor to eliminate
-- the security warnings.
-- ============================================

-- Drop the problematic views completely
DROP VIEW IF EXISTS public.user_project_stats CASCADE;
DROP VIEW IF EXISTS public.project_progress CASCADE;

-- Verification: Ensure views are deleted
SELECT 
  schemaname,
  viewname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('user_project_stats', 'project_progress');

-- This query should return 0 rows if successful

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SECURITY DEFINER Views Removed!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Removed views:';
  RAISE NOTICE '  ✓ user_project_stats (deleted)';
  RAISE NOTICE '  ✓ project_progress (deleted)';
  RAISE NOTICE '';
  RAISE NOTICE 'Security warnings: RESOLVED';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: If you need these analytics views, you can:';
  RAISE NOTICE '  1. Query the tables directly in your app';
  RAISE NOTICE '  2. Create materialized views (better performance)';
  RAISE NOTICE '  3. Use Supabase Functions for complex queries';
  RAISE NOTICE '============================================';
END $$;
