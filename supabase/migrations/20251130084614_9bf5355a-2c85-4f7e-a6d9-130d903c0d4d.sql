-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Report',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  client_name TEXT,
  client_email TEXT,
  inspection_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create report_blocks table for block-based content
CREATE TABLE public.report_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'heading', 'image', 'checklist', 'signature')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient ordering
CREATE INDEX idx_report_blocks_report_order ON public.report_blocks(report_id, order_index);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
  ON public.reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
  ON public.reports FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for report_blocks
CREATE POLICY "Users can view blocks of their own reports"
  ON public.report_blocks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.reports
    WHERE reports.id = report_blocks.report_id
    AND reports.user_id = auth.uid()
  ));

CREATE POLICY "Users can create blocks in their own reports"
  ON public.report_blocks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.reports
    WHERE reports.id = report_blocks.report_id
    AND reports.user_id = auth.uid()
  ));

CREATE POLICY "Users can update blocks in their own reports"
  ON public.report_blocks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.reports
    WHERE reports.id = report_blocks.report_id
    AND reports.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete blocks from their own reports"
  ON public.report_blocks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.reports
    WHERE reports.id = report_blocks.report_id
    AND reports.user_id = auth.uid()
  ));

-- Trigger for updated_at on reports
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_blocks_updated_at
  BEFORE UPDATE ON public.report_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();