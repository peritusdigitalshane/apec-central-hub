-- Create report templates table
CREATE TABLE public.report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  category TEXT,
  -- Template data fields
  job_number TEXT,
  location TEXT,
  subject TEXT,
  order_number TEXT,
  technician TEXT,
  report_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create template blocks table (similar to report_blocks)
CREATE TABLE public.template_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'heading', 'image', 'checklist', 'signature', 'photo_upload', 'data_table', 'notes')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient ordering
CREATE INDEX idx_template_blocks_template_order ON public.template_blocks(template_id, order_index);

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_templates
-- Everyone can view published templates
CREATE POLICY "Users can view published templates"
  ON public.report_templates FOR SELECT
  USING (status = 'published' OR public.is_admin_or_super(auth.uid()));

-- Admins can create templates
CREATE POLICY "Admins can create templates"
  ON public.report_templates FOR INSERT
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Admins can update templates
CREATE POLICY "Admins can update templates"
  ON public.report_templates FOR UPDATE
  USING (public.is_admin_or_super(auth.uid()));

-- Admins can delete templates
CREATE POLICY "Admins can delete templates"
  ON public.report_templates FOR DELETE
  USING (public.is_admin_or_super(auth.uid()));

-- RLS Policies for template_blocks
-- Users can view blocks of published templates
CREATE POLICY "Users can view published template blocks"
  ON public.template_blocks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.report_templates
    WHERE report_templates.id = template_blocks.template_id
    AND (report_templates.status = 'published' OR public.is_admin_or_super(auth.uid()))
  ));

-- Admins can create template blocks
CREATE POLICY "Admins can create template blocks"
  ON public.template_blocks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.report_templates
    WHERE report_templates.id = template_blocks.template_id
    AND public.is_admin_or_super(auth.uid())
  ));

-- Admins can update template blocks
CREATE POLICY "Admins can update template blocks"
  ON public.template_blocks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.report_templates
    WHERE report_templates.id = template_blocks.template_id
    AND public.is_admin_or_super(auth.uid())
  ));

-- Admins can delete template blocks
CREATE POLICY "Admins can delete template blocks"
  ON public.template_blocks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.report_templates
    WHERE report_templates.id = template_blocks.template_id
    AND public.is_admin_or_super(auth.uid())
  ));

-- Add trigger for updated_at
CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_blocks_updated_at
  BEFORE UPDATE ON public.template_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add template_id to reports table to track which template was used
ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.report_templates(id);