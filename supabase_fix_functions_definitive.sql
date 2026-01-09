-- ============================================
-- DEFINITIVE FIX: Function Search Path Warnings
-- ============================================
-- This script forcefully recreates all functions with proper search_path
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PREVENT_DUPLICATE_FRIEND_REQUEST
-- ============================================
DROP FUNCTION IF EXISTS public.prevent_duplicate_friend_request() CASCADE;

CREATE FUNCTION public.prevent_duplicate_friend_request()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
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
    AND status IN ('pending', 'accepted')
  ) THEN
    RAISE EXCEPTION 'A friend request already exists between these users';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS check_duplicate_friend_request ON friend_requests;
CREATE TRIGGER check_duplicate_friend_request
  BEFORE INSERT OR UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_friend_request();

-- ============================================
-- 2. GET_USER_PROJECT_ROLE
-- ============================================
DROP FUNCTION IF EXISTS public.get_user_project_role(uuid, uuid) CASCADE;

CREATE FUNCTION public.get_user_project_role(p_project_id uuid, p_user_id uuid)
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
-- 3. CAN_MANAGE_CHECKPOINT
-- ============================================
DROP FUNCTION IF EXISTS public.can_manage_checkpoint(uuid) CASCADE;

CREATE FUNCTION public.can_manage_checkpoint(p_checkpoint_id uuid)
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

-- Recreate RLS policy that uses this function
DROP POLICY IF EXISTS "Managers can update checkpoints" ON checkpoints;
CREATE POLICY "Managers can update checkpoints" ON checkpoints
  FOR UPDATE
  USING (can_manage_checkpoint(id))
  WITH CHECK (can_manage_checkpoint(id));

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type,
  CASE 
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security,
  proconfig as settings
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'prevent_duplicate_friend_request',
    'get_user_project_role',
    'can_manage_checkpoint'
  )
ORDER BY proname;

-- ============================================
-- COMPLETION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'All Functions Fixed!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Updated functions:';
  RAISE NOTICE '  ✓ prevent_duplicate_friend_request';
  RAISE NOTICE '  ✓ get_user_project_role';
  RAISE NOTICE '  ✓ can_manage_checkpoint';
  RAISE NOTICE '';
  RAISE NOTICE 'All have: SET search_path = public, pg_temp';
  RAISE NOTICE '';
  RAISE NOTICE 'Remaining: Enable Leaked Password Protection';
  RAISE NOTICE '  Go to: Dashboard → Auth → Policies';
  RAISE NOTICE '============================================';
END $$;
