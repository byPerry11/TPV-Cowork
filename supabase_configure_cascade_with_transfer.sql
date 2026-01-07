-- Automatic Project Ownership Transfer on User Deletion (FIXED VERSION)
-- This version only configures tables that exist in your database

-- First, create a function to handle the transfer
CREATE OR REPLACE FUNCTION transfer_project_ownership()
RETURNS TRIGGER AS $$
DECLARE
    project_record RECORD;
    new_owner_id UUID;
BEGIN
    -- For each project owned by the user being deleted
    FOR project_record IN 
        SELECT id FROM projects WHERE owner_id = OLD.id
    LOOP
        -- Find the next best member to inherit the project
        -- Priority: active admin > active manager > active member
        SELECT user_id INTO new_owner_id
        FROM project_members
        WHERE project_id = project_record.id
          AND user_id != OLD.id  -- Don't select the user being deleted
          AND status = 'active'
        ORDER BY 
            CASE role
                WHEN 'admin' THEN 1
                WHEN 'manager' THEN 2
                WHEN 'member' THEN 3
                ELSE 4
            END,
            created_at ASC  -- If multiple with same role, pick the oldest member
        LIMIT 1;

        -- If we found a suitable member, transfer ownership
        IF new_owner_id IS NOT NULL THEN
            UPDATE projects 
            SET owner_id = new_owner_id 
            WHERE id = project_record.id;
            
            -- Ensure the new owner is also set as 'admin' in project_members
            UPDATE project_members
            SET role = 'admin'
            WHERE project_id = project_record.id 
              AND user_id = new_owner_id;
              
            RAISE NOTICE 'Project % transferred to user %', project_record.id, new_owner_id;
        ELSE
            -- No suitable member found, set owner to NULL (orphaned project)
            UPDATE projects 
            SET owner_id = NULL 
            WHERE id = project_record.id;
            
            RAISE NOTICE 'Project % orphaned (no members to transfer to)', project_record.id;
        END IF;
    END LOOP;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS transfer_projects_before_user_delete ON auth.users;

CREATE TRIGGER transfer_projects_before_user_delete
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION transfer_project_ownership();

-- Configure CASCADE constraints

-- 1. Projects: Set to NULL (trigger handles transfer)
ALTER TABLE projects 
  DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;
ALTER TABLE projects 
  ADD CONSTRAINT projects_owner_id_fkey 
  FOREIGN KEY (owner_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- 2. Profiles: CASCADE
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 3. Project Members: CASCADE on user deletion
ALTER TABLE project_members 
  DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;
ALTER TABLE project_members 
  ADD CONSTRAINT project_members_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 4. Project Members: CASCADE on project deletion
ALTER TABLE project_members 
  DROP CONSTRAINT IF EXISTS project_members_project_id_fkey;
ALTER TABLE project_members 
  ADD CONSTRAINT project_members_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES projects(id) 
  ON DELETE CASCADE;

-- 5. Checkpoints: CASCADE on project deletion
ALTER TABLE checkpoints 
  DROP CONSTRAINT IF EXISTS checkpoints_project_id_fkey;
ALTER TABLE checkpoints 
  ADD CONSTRAINT checkpoints_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES projects(id) 
  ON DELETE CASCADE;

-- 6. Evidences: CASCADE on user deletion
ALTER TABLE evidences 
  DROP CONSTRAINT IF EXISTS evidences_user_id_fkey;
ALTER TABLE evidences 
  ADD CONSTRAINT evidences_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 7. Evidences: CASCADE on checkpoint deletion
ALTER TABLE evidences 
  DROP CONSTRAINT IF EXISTS evidences_checkpoint_id_fkey;
ALTER TABLE evidences 
  ADD CONSTRAINT evidences_checkpoint_id_fkey 
  FOREIGN KEY (checkpoint_id) 
  REFERENCES checkpoints(id) 
  ON DELETE CASCADE;

-- 8. Friend Requests: CASCADE on sender deletion
ALTER TABLE friend_requests 
  DROP CONSTRAINT IF EXISTS friend_requests_sender_id_fkey;
ALTER TABLE friend_requests 
  ADD CONSTRAINT friend_requests_sender_id_fkey 
  FOREIGN KEY (sender_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 9. Friend Requests: CASCADE on receiver deletion
ALTER TABLE friend_requests 
  DROP CONSTRAINT IF EXISTS friend_requests_receiver_id_fkey;
ALTER TABLE friend_requests 
  ADD CONSTRAINT friend_requests_receiver_id_fkey 
  FOREIGN KEY (receiver_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Summary:
-- ✅ Project ownership transfers automatically to next admin/manager/member
-- ✅ All user-related data cascades on deletion
-- ✅ No "friendships" table references (doesn't exist in your DB)
