-- ============================================
-- FIX: Duplicate transfer_project_ownership
-- ============================================
-- Remove old TRIGGER version and keep only the void function

-- Drop the old trigger version (if it exists)
DROP FUNCTION IF EXISTS public.transfer_project_ownership() CASCADE;

-- Ensure the correct void version exists with search_path
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

-- Verify only one version exists
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type,
  proconfig as settings
FROM pg_proc
WHERE proname = 'transfer_project_ownership'
  AND pronamespace = 'public'::regnamespace;

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Duplicate Function Removed!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Removed: transfer_project_ownership() trigger version';
  RAISE NOTICE 'Kept: transfer_project_ownership(uuid, uuid) void version';
  RAISE NOTICE '';
  RAISE NOTICE '✓ All functions now have search_path set';
  RAISE NOTICE '============================================';
END $$;
