-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can create template blocks" ON template_blocks;

-- Create a simpler, more reliable policy for inserting template blocks
CREATE POLICY "Admins can create template blocks"
ON template_blocks
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_super(auth.uid()));