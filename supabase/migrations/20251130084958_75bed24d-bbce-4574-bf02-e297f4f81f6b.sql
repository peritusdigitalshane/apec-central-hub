-- Create storage bucket for inspection photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for inspection photos
CREATE POLICY "Users can view inspection photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inspection-photos');

CREATE POLICY "Authenticated users can upload inspection photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'inspection-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their inspection photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'inspection-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their inspection photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'inspection-photos' 
    AND auth.role() = 'authenticated'
  );

-- Add inspection-specific fields to reports table
ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS job_number TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS order_number TEXT,
ADD COLUMN IF NOT EXISTS technician TEXT,
ADD COLUMN IF NOT EXISTS report_number TEXT;

-- Add index for searching by job number
CREATE INDEX IF NOT EXISTS idx_reports_job_number ON public.reports(job_number);

-- Update the block types to support more inspection-specific blocks
ALTER TABLE public.report_blocks
DROP CONSTRAINT IF EXISTS report_blocks_type_check;

ALTER TABLE public.report_blocks
ADD CONSTRAINT report_blocks_type_check 
CHECK (type IN ('text', 'heading', 'image', 'checklist', 'signature', 'photo_upload', 'data_table', 'notes'));