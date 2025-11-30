-- Update the handle_new_user function to make the first user a super admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  assigned_role app_role;
BEGIN
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- If this is the first user, make them super_admin, otherwise staff
  IF user_count = 1 THEN
    assigned_role := 'super_admin';
  ELSE
    assigned_role := 'staff';
  END IF;
  
  -- Insert profile
  INSERT INTO public.profiles (id, user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  RETURN NEW;
END;
$$;

-- Update RLS policy to allow super admins to promote other users to super_admin
DROP POLICY IF EXISTS "Super admins can update roles" ON public.user_roles;

CREATE POLICY "Super admins can update all roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));