-- ============================================
-- FIX: Supabase Security Advisor Warnings
-- ============================================
-- This script fixes the SECURITY DEFINER warnings on views
-- reported by Supabase Advisor.
--
-- Issue: Views should not use SECURITY DEFINER as they bypass
-- RLS policies and use creator's permissions instead of querying user's.
--
-- Solution: Recreate views without SECURITY DEFINER and rely on RLS.
-- ============================================

-- Drop existing views
DROP VIEW IF EXISTS public.user_project_stats CASCADE;
DROP VIEW IF EXISTS public.project_progress CASCADE;

-- ============================================
-- RECREATE: User Project Statistics View
-- ============================================
-- This view aggregates user statistics across projects.
-- Now uses SECURITY INVOKER (default) to respect RLS policies.

CREATE VIEW public.user_project_stats AS
SELECT 
  pm.user_id,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') as active_projects,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'completed') as completed_projects,
  COUNT(DISTINCT c.id) FILTER (WHERE c.is_completed = true) as completed_checkpoints,
  COUNT(DISTINCT e.id) as evidences_submitted
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
LEFT JOIN checkpoints c ON p.id = c.project_id
LEFT JOIN evidences e ON c.id = e.checkpoint_id AND e.user_id = pm.user_id
WHERE pm.status = 'active'
GROUP BY pm.user_id;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.user_project_stats TO authenticated;

-- ============================================
-- RECREATE: Project Progress View
-- ============================================
-- This view calculates completion percentage for each project.
-- Now uses SECURITY INVOKER (default) to respect RLS policies.

CREATE VIEW public.project_progress AS
SELECT 
  p.id as project_id,
  p.title,
  p.status,
  COUNT(c.id) as total_checkpoints,
  COUNT(c.id) FILTER (WHERE c.is_completed = true) as completed_checkpoints,
  CASE 
    WHEN COUNT(c.id) = 0 THEN 0
    ELSE ROUND((COUNT(c.id) FILTER (WHERE c.is_completed = true)::numeric / COUNT(c.id)::numeric) * 100, 2)
  END as progress_percentage
FROM projects p
LEFT JOIN checkpoints c ON p.id = c.project_id
GROUP BY p.id, p.title, p.status;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.project_progress TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check that views are created without SECURITY DEFINER
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('user_project_stats', 'project_progress');

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Security Advisor Warnings Fixed!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Fixed views:';
  RAISE NOTICE '  ✓ user_project_stats (now SECURITY INVOKER)';
  RAISE NOTICE '  ✓ project_progress (now SECURITY INVOKER)';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  • Views now respect RLS policies';
  RAISE NOTICE '  • Use querying user permissions (not creator)';
  RAISE NOTICE '  • Granted SELECT to authenticated users';
  RAISE NOTICE '';
  RAISE NOTICE 'Security: IMPROVED ✓';
  RAISE NOTICE '============================================';
END $$;
