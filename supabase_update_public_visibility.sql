/*
 * FIX: Public Project Visibility
 * ------------------------------
 * Issue: Users should be able to see "Public" projects on other users' profiles,
 * even if they are not members of those projects.
 *
 * SOLUTION: Add a policy to allow SELECT on projects where is_public = true.
 */

-- Ensure the policy exists (or create a new one)
-- Only 'authenticated' users usually valid for auth.uid() checks, but 'true' works for public too.

CREATE POLICY "Public projects are visible to everyone"
ON projects FOR SELECT
USING (
  is_public = true
);

-- Note: The previous policy "Members can view project" covers members.
-- This new policy covers non-members viewing public projects.
-- RLS policies are additive (OR logic), so either condition allows access.
