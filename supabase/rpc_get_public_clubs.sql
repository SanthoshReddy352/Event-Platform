-- Function to safely fetch public club details (bypassing RLS)
-- This allows any user (anon or authenticated) to see the list of clubs and their logos
-- without exposing sensitive admin data (like role, keys, etc.)

CREATE OR REPLACE FUNCTION get_public_clubs()
RETURNS TABLE (
  user_id UUID,
  club_name TEXT,
  club_logo_url TEXT
) 
SECURITY DEFINER -- Runs with privileges of the creator (admin), bypassing RLS
SET search_path = public -- Secure search path
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.user_id, 
    au.club_name, 
    au.club_logo_url
  FROM admin_users au
  WHERE au.club_name IS NOT NULL;
END;
$$;
