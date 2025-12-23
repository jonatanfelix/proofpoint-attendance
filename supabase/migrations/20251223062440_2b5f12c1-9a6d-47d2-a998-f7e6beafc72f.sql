-- Update the user 'jo' (jonatanfelixtheng@gmail.com) to developer role
UPDATE public.user_roles 
SET role = 'developer' 
WHERE user_id = '845ada18-d7ca-41e6-8534-af8dd5c38e93';

-- Also update in profiles
UPDATE public.profiles 
SET role = 'developer' 
WHERE user_id = '845ada18-d7ca-41e6-8534-af8dd5c38e93';

-- Create a function to check if user is developer
CREATE OR REPLACE FUNCTION public.is_developer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'developer'
  )
$$;

-- Create a function to check if user is admin or developer
CREATE OR REPLACE FUNCTION public.is_admin_or_developer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'developer')
  )
$$;