/*
 * FIX: Infinite Recursion in project_members
 * ------------------------------------------
 * The previous policy caused recursion because checking "am I a member" 
 * tried to queries project_members, which triggered the policy again.
 *
 * SOLUTION: Use SECURITY DEFINER functions to bypass RLS for permission checks.
 */

-- 1. Create Helper Functions (Bypass RLS)
CREATE OR REPLACE FUNCTION is_project_member(_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = _project_id 
    AND user_id = auth.uid()
    -- No status check? 'pending' should not see other members? 
    -- Usually only 'active' members see others.
    AND status = 'active' 
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_project_admin(_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = _project_id 
    AND user_id = auth.uid()
    AND role = 'admin'
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop Recursive Policies
DROP POLICY IF EXISTS "See project members" ON project_members;
DROP POLICY IF EXISTS "Project admins can add members" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;

-- 3. Re-create Policies using Functions

-- SELECT: Active members can see other members. Owners can always see.
CREATE POLICY "See project members"
ON project_members FOR SELECT
USING (
    is_project_member(project_id)
    OR
    EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid())
);

-- INSERT: Admins can add members
CREATE POLICY "Project admins can add members"
ON project_members FOR INSERT
WITH CHECK (
    is_project_admin(project_id)
);

-- INSERT: Owners can add members
CREATE POLICY "Project owners can add members"
ON project_members FOR INSERT
WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid())
);
