-- Add status column to project_members
-- Possible values: 'pending', 'active', 'rejected'
-- Default to 'active' for existing rows to not break current members.
-- New inserts (invites) will be 'pending'.

ALTER TABLE project_members 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Optional: Add a check constraint
ALTER TABLE project_members 
ADD CONSTRAINT check_status CHECK (status IN ('active', 'pending', 'rejected'));
