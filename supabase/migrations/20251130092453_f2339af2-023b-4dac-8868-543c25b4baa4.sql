-- Add approval fields to invoices table
ALTER TABLE public.invoices
ADD COLUMN submitted_for_approval BOOLEAN DEFAULT false,
ADD COLUMN approved_by UUID REFERENCES auth.users(id),
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;

-- Update RLS policy for users to prevent editing submitted invoices
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;

CREATE POLICY "Users can update their own invoices"
  ON public.invoices FOR UPDATE
  USING (user_id = auth.uid() AND (submitted_for_approval = false OR submitted_for_approval IS NULL));

-- Add policy for admins to approve invoices
CREATE POLICY "Admins can approve invoices"
  ON public.invoices FOR UPDATE
  USING (is_admin_or_super(auth.uid()));