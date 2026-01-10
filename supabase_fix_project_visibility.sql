/*
 * FIX: Project Visibility for Pending Members
 * -------------------------------------------
 * Issue: Even if the invitation (project_members) is visible, the Projects table RLS
 * might hide the Project details (Title, Owner) from 'pending' users.
 * This results in null project data in the notification card.
 *
 * SOLUTION: Allow any user listed in project_members (active/pending) to SELECT the project.
 */

-- Create Policy on PROJECTS table
DROP POLICY IF EXISTS "Members can view project" ON projects;

CREATE POLICY "Members can view project"
ON projects FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM project_members 
    WHERE project_id = projects.id
    -- No status check needed here, existence implies association
  )
);
