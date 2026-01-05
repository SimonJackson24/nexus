-- Seed Admin User for Nexus
-- Run this after schema-hybrid.sql to create a default admin account
-- WARNING: Change the password immediately after first login!

-- Default admin credentials (CHANGE THESE!)
-- Email: admin@nexus.local
-- Password: (auto-generated on first run, see deploy script)

-- Create admin user via Supabase Auth (run this via the admin API, not SQL):
-- POST /auth/v1/admin/users
-- {
--   "email": "admin@nexus.local",
--   "password": "secure-password-here",
--   "email_confirm": true,
--   "user_metadata": {
--     "is_admin": true,
--     "force_password_change": true
--   }
-- }

-- Function to check if user needs password change
CREATE OR REPLACE FUNCTION user_needs_password_change(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id
    AND user_metadata->>'force_password_change' = 'true'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear force password change flag
CREATE OR REPLACE FUNCTION clear_force_password_change(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE auth.users
  SET user_metadata = user_metadata - 'force_password_change',
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate secure random password
CREATE OR REPLACE FUNCTION generate_secure_password(length INTEGER DEFAULT 16)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substring(chars FROM floor(random() * length(chars))::int + 1 FOR 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Note: The actual admin user creation happens via the Supabase Auth Admin API
-- because passwords are hashed before storage and we don't have access to the
-- internal hashing functions from SQL.

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION user_needs_password_change(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_force_password_change(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_secure_password(INTEGER) TO authenticated;
