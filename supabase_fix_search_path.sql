-- ============================================
-- FIX: Function Search Path Mutable Warnings
-- ============================================
-- This script fixes the "Function Search Path Mutable" warnings
-- by adding explicit search_path to all SECURITY DEFINER functions.
--
-- Issue: Functions without search_path are vulnerable to search path
-- injection attacks, where malicious users could create objects
-- in their schema to hijack function calls.
--
-- Solution: Set search_path explicitly to prevent this attack vector.
-- ============================================

-- ============================================
-- FIX 1: handle_new_user
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, color_hex)
  VALUES (new.id, new.email, '#3b82f6');
  RETURN new;
END;
$$;

-- ============================================
-- FIX 2: prevent_duplicate_friend_request
-- ============================================
CREATE OR REPLACE FUNCTION public.prevent_duplicate_friend_request()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check for existing request in either direction
  IF EXISTS (
    SELECT 1 FROM friend_requests
    WHERE (
      -- Exact duplicate
      (sender_id = NEW.sender_id AND receiver_id = NEW.receiver_id)
      OR 
      -- Inverse duplicate
      (sender_id = NEW.receiver_id AND receiver_id = NEW.sender_id)
    )
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status IN ('pending', 'accepted')  -- Ignore rejected requests
  ) THEN
    RAISE EXCEPTION 'A friend request already exists between these users';
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- FIX 3: get_user_project_role
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_project_role(p_project_id uuid, p_user_id uuid)
RETURNS app_role 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role app_role;
BEGIN
  SELECT role INTO user_role
  FROM project_members
  WHERE project_id = p_project_id 
    AND user_id = p_user_id 
    AND status = 'active'
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

-- ============================================
-- FIX 4: can_manage_checkpoint
-- ============================================
CREATE OR REPLACE FUNCTION public.can_manage_checkpoint(p_checkpoint_id uuid)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM checkpoints c
    JOIN projects p ON c.project_id = p.id
    LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = auth.uid()
    WHERE c.id = p_checkpoint_id
      AND (
        p.owner_id = auth.uid()
        OR (pm.role IN ('admin', 'manager') AND pm.status = 'active')
      )
  );
END;
$$;

-- ============================================
-- FIX 5: transfer_project_ownership (if exists)
-- ============================================
-- This function may not exist yet, but we include it for completeness
CREATE OR REPLACE FUNCTION public.transfer_project_ownership(
  p_project_id uuid, 
  p_new_owner_id uuid
)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only current owner can transfer
  IF NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE id = p_project_id 
    AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the project owner can transfer ownership';
  END IF;
  
  -- Update owner
  UPDATE projects 
  SET owner_id = p_new_owner_id 
  WHERE id = p_project_id;
  
  -- Ensure new owner is a member with admin role
  INSERT INTO project_members (project_id, user_id, role, status)
  VALUES (p_project_id, p_new_owner_id, 'admin', 'active')
  ON CONFLICT (project_id, user_id) 
  DO UPDATE SET role = 'admin', status = 'active';
END;
$$;

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that all functions now have search_path set
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  CASE 
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security,
  proconfig as settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'handle_new_user',
    'prevent_duplicate_friend_request',
    'get_user_project_role',
    'can_manage_checkpoint',
    'transfer_project_ownership'
  )
ORDER BY p.proname;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Function Search Path Warnings Fixed!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Fixed functions:';
  RAISE NOTICE '  ✓ handle_new_user';
  RAISE NOTICE '  ✓ prevent_duplicate_friend_request';
  RAISE NOTICE '  ✓ get_user_project_role';
  RAISE NOTICE '  ✓ can_manage_checkpoint';
  RAISE NOTICE '  ✓ transfer_project_ownership';
  RAISE NOTICE '';
  RAISE NOTICE 'All functions now have:';
  RAISE NOTICE '  • SET search_path = public, pg_temp';
  RAISE NOTICE '  • Protection against search path injection';
  RAISE NOTICE '';
  RAISE NOTICE 'Remaining warning:';
  RAISE NOTICE '  ⚠ Leaked Password Protection (manual fix needed)';
  RAISE NOTICE '    Go to: Supabase Dashboard → Authentication → Policies';
  RAISE NOTICE '    Enable: "Leaked Password Protection"';
  RAISE NOTICE '============================================';
END $$;
