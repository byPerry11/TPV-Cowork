-- ============================================
-- PROJECT MEMBERS ENHANCEMENTS & LEAVE STATUS
-- ============================================

-- 1. Ensure 'member_color' column exists
ALTER TABLE project_members
ADD COLUMN IF NOT EXISTS member_color VARCHAR(7) DEFAULT '#808080';

-- 2. Update status constraint to include 'left' and 'rejected'
-- First drop existing constraint if it exists (names may vary, checking logic)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'project_members_status_check'
    ) THEN
        ALTER TABLE project_members DROP CONSTRAINT project_members_status_check;
    END IF;
END $$;

-- Add new constraint
ALTER TABLE project_members
ADD CONSTRAINT project_members_status_check 
CHECK (status IN ('pending', 'active', 'rejected', 'left'));

-- 3. Function to assign random color
CREATE OR REPLACE FUNCTION set_random_member_color()
RETURNS TRIGGER AS $$
BEGIN
    -- Values: md5 of random gives hex, substring 6 chars, prefix #
    NEW.member_color := (
        SELECT '#' || substring(md5(random()::text) from 1 for 6)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to auto-assign color on insert
DROP TRIGGER IF EXISTS trigger_set_member_color ON project_members;
CREATE TRIGGER trigger_set_member_color
BEFORE INSERT ON project_members
FOR EACH ROW
WHEN (NEW.member_color IS NULL OR NEW.member_color = '#808080')
EXECUTE FUNCTION set_random_member_color();

-- ============================================
-- VERIFICATION
-- ============================================
SELECT * FROM information_schema.columns 
WHERE table_name = 'project_members' AND column_name = 'member_color';
