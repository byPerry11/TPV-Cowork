-- ============================================
-- PROJECT ENHANCEMENTS - Categories, Colors, Icons
-- ============================================
-- This script adds category, color, description, icon,
-- tags, and visibility fields to projects
-- ============================================

-- Add new columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS category VARCHAR(50),
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS project_icon VARCHAR(10) DEFAULT '📁',
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);

-- Create index for tags (GIN index for array searching)
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags);

-- Constraint for valid hex color
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS valid_hex_color;

ALTER TABLE projects
ADD CONSTRAINT valid_hex_color 
CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Check that new columns exist
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'projects'
    AND column_name IN ('category', 'color', 'description', 'project_icon', 'tags', 'is_public')
ORDER BY column_name;

-- ============================================
-- COMPLETION
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Project Enhancements Applied!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'New columns added:';
    RAISE NOTICE '  ✓ category (engineering category)';
    RAISE NOTICE '  ✓ color (hex color for cards)';
    RAISE NOTICE '  ✓ description (project details)';
    RAISE NOTICE '  ✓ project_icon (emoji icon)';
    RAISE NOTICE '  ✓ tags (array for filtering)';
    RAISE NOTICE '  ✓ is_public (visibility toggle)';
    RAISE NOTICE '';
    RAISE NOTICE 'Indexes created for performance';
    RAISE NOTICE '============================================';
END $$;
