-- ENHANCED REGISTRATION SYSTEM

-- 1. Add display_name to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. Update handle_new_user function to use metadata
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, color_hex)
  VALUES (
    new.id, 
    -- Use metadata username or fallback to email part
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), 
    -- Use metadata display_name or fallback to username
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    '#3b82f6'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
