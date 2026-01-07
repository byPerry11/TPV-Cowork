-- Add rating and admin_comment to checkpoints

ALTER TABLE checkpoints 
ADD COLUMN IF NOT EXISTS rating numeric(3,1), -- Allows 10.0, 9.5, etc.
ADD COLUMN IF NOT EXISTS admin_comment text;

-- Check constraint for rating range
ALTER TABLE checkpoints 
ADD CONSTRAINT check_rating_range CHECK (rating >= 0 AND rating <= 10);
