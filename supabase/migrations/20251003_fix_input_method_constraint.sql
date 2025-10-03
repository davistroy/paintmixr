-- Fix input_method constraint to match application enum values
-- Previous constraint only allowed: 'hex', 'picker', 'image'
-- Application now uses: 'hex_input', 'color_picker', 'image_upload', 'manual_ratios'

BEGIN;

-- Drop the old constraint
ALTER TABLE mixing_sessions
DROP CONSTRAINT IF EXISTS mixing_sessions_input_method_check;

-- Add new constraint with updated values
ALTER TABLE mixing_sessions
ADD CONSTRAINT mixing_sessions_input_method_check
CHECK (input_method IN (
  'hex_input',
  'color_picker',
  'image_upload',
  'manual_ratios',
  'hex',       -- Keep old values for backwards compatibility
  'picker',    -- Keep old values for backwards compatibility
  'image'      -- Keep old values for backwards compatibility
));

-- Update comment
COMMENT ON COLUMN mixing_sessions.input_method IS 'How the color was input: hex_input, color_picker, image_upload, or manual_ratios';

COMMIT;
