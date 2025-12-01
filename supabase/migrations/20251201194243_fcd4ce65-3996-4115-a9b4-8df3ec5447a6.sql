-- Drop existing policy that might conflict
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;

-- Create a simpler policy that just checks user_id without function calls
CREATE POLICY "Users can view their own role"
ON user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());