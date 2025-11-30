-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  invoice_number TEXT,
  date DATE,
  customer_name TEXT,
  customer_company TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  purchase_order TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  total DECIMAL(10,2),
  gst DECIMAL(10,2),
  total_inc_gst DECIMAL(10,2),
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoice_blocks table
CREATE TABLE public.invoice_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoice_template_blocks table (admins can customize structure)
CREATE TABLE public.invoice_template_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_template_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Users can view their own invoices"
  ON public.invoices FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all invoices"
  ON public.invoices FOR SELECT
  USING (is_admin_or_super(auth.uid()));

CREATE POLICY "Users can create invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON public.invoices FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can update all invoices"
  ON public.invoices FOR UPDATE
  USING (is_admin_or_super(auth.uid()));

CREATE POLICY "Users can delete their own draft invoices"
  ON public.invoices FOR DELETE
  USING (user_id = auth.uid() AND status = 'draft');

CREATE POLICY "Admins can delete any invoice"
  ON public.invoices FOR DELETE
  USING (is_admin_or_super(auth.uid()));

-- RLS Policies for invoice_blocks
CREATE POLICY "Users can view blocks of their own invoices"
  ON public.invoice_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_blocks.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all invoice blocks"
  ON public.invoice_blocks FOR SELECT
  USING (is_admin_or_super(auth.uid()));

CREATE POLICY "Users can create blocks in their own invoices"
  ON public.invoice_blocks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_blocks.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update blocks in their own invoices"
  ON public.invoice_blocks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_blocks.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete blocks from their own invoices"
  ON public.invoice_blocks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_blocks.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- RLS Policies for invoice_template_blocks (admin only for modifications)
CREATE POLICY "Everyone can view invoice template"
  ON public.invoice_template_blocks FOR SELECT
  USING (true);

CREATE POLICY "Admins can create template blocks"
  ON public.invoice_template_blocks FOR INSERT
  WITH CHECK (is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update template blocks"
  ON public.invoice_template_blocks FOR UPDATE
  USING (is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete template blocks"
  ON public.invoice_template_blocks FOR DELETE
  USING (is_admin_or_super(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_blocks_updated_at
  BEFORE UPDATE ON public.invoice_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_template_blocks_updated_at
  BEFORE UPDATE ON public.invoice_template_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();