/*
 * FIX: Pending Member Visibility
 * ------------------------------
 * Issue: Users with 'pending' status in project_members cannot see the project details
 * because the is_project_member() function only checks for 'active' status.
 *
 * This prevents the Notifications page from displaying the Project Title/Owner for invitations.
 *
 * SOLUTION: Update is_project_member to return TRUE for 'pending' members as well.
 */

CREATE OR REPLACE FUNCTION is_project_member(_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = _project_id 
    AND user_id = auth.uid()
    -- Allow both active and pending members to 'see' the project
    AND status IN ('active', 'pending')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
