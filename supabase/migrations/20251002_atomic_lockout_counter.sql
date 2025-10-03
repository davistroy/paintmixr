-- Migration: Atomic Failed Login Attempt Counter
-- Feature: 005-use-codebase-analysis
-- Purpose: Prevent race conditions in account lockout tracking
-- Created: 2025-10-02

-- Drop function if exists (for rollback/re-creation)
DROP FUNCTION IF EXISTS increment_failed_login_attempts(UUID);

-- Create atomic counter function for failed login attempts
-- This function ensures thread-safe increments under concurrent load
CREATE OR REPLACE FUNCTION increment_failed_login_attempts(user_id UUID)
RETURNS TABLE(new_attempt_count INT, lockout_until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atomically increment failed_login_attempts in user metadata
  -- Uses JSONB operations to ensure consistency
  RETURN QUERY
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{failed_login_attempts}',
    to_jsonb(COALESCE((raw_user_meta_data->>'failed_login_attempts')::int, 0) + 1)
  )
  WHERE id = user_id
  RETURNING
    (raw_user_meta_data->>'failed_login_attempts')::int AS new_attempt_count,
    (raw_user_meta_data->>'lockout_until')::timestamptz AS lockout_until;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION increment_failed_login_attempts(UUID) TO authenticated;

-- Grant execution to service role for admin operations
GRANT EXECUTE ON FUNCTION increment_failed_login_attempts(UUID) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION increment_failed_login_attempts(UUID) IS
  'Atomically increments failed login attempts counter in user metadata. ' ||
  'Returns new attempt count and lockout_until timestamp. ' ||
  'Prevents race conditions under concurrent authentication attempts.';
