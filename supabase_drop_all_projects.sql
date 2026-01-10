/*
 * UTILITY: Drop All Projects
 * --------------------------
 * This script deletes ALL projects from the database.
 * Because of ON DELETE CASCADE foreign keys, this should also remove:
 * - project_members
 * - checkpoints
 * - etc.
 *
 * USE WITH CAUTION!
 */

TRUNCATE TABLE projects CASCADE;

-- If cascade doesn't cover everything or if you want to be sure:
-- TRUNCATE TABLE project_members CASCADE;
-- TRUNCATE TABLE checkpoints CASCADE;
