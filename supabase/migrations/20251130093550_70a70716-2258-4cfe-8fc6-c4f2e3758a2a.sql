-- Create report_types table
CREATE TABLE public.report_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on report_types
ALTER TABLE public.report_types ENABLE ROW LEVEL SECURITY;

-- Everyone can view report types
CREATE POLICY "Everyone can view report types"
ON public.report_types
FOR SELECT
USING (true);

-- Admins can create report types
CREATE POLICY "Admins can create report types"
ON public.report_types
FOR INSERT
WITH CHECK (is_admin_or_super(auth.uid()));

-- Admins can update report types
CREATE POLICY "Admins can update report types"
ON public.report_types
FOR UPDATE
USING (is_admin_or_super(auth.uid()));

-- Admins can delete report types
CREATE POLICY "Admins can delete report types"
ON public.report_types
FOR DELETE
USING (is_admin_or_super(auth.uid()));

-- Create knowledge_base_documents table
CREATE TABLE public.knowledge_base_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type_id UUID NOT NULL REFERENCES public.report_types(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on knowledge_base_documents
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;

-- Admins can view all knowledge base documents
CREATE POLICY "Admins can view all knowledge base documents"
ON public.knowledge_base_documents
FOR SELECT
USING (is_admin_or_super(auth.uid()));

-- Admins can create knowledge base documents
CREATE POLICY "Admins can create knowledge base documents"
ON public.knowledge_base_documents
FOR INSERT
WITH CHECK (is_admin_or_super(auth.uid()));

-- Admins can update knowledge base documents
CREATE POLICY "Admins can update knowledge base documents"
ON public.knowledge_base_documents
FOR UPDATE
USING (is_admin_or_super(auth.uid()));

-- Admins can delete knowledge base documents
CREATE POLICY "Admins can delete knowledge base documents"
ON public.knowledge_base_documents
FOR DELETE
USING (is_admin_or_super(auth.uid()));

-- Add report_type_id to reports table
ALTER TABLE public.reports ADD COLUMN report_type_id UUID REFERENCES public.report_types(id) ON DELETE SET NULL;

-- Add trigger for report_types updated_at
CREATE TRIGGER update_report_types_updated_at
BEFORE UPDATE ON public.report_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for knowledge_base_documents updated_at
CREATE TRIGGER update_knowledge_base_documents_updated_at
BEFORE UPDATE ON public.knowledge_base_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for knowledge base documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base', 'knowledge-base', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for knowledge base documents
CREATE POLICY "Admins can upload knowledge base documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-base' AND
  is_admin_or_super(auth.uid())
);

CREATE POLICY "Admins can view knowledge base documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'knowledge-base' AND
  is_admin_or_super(auth.uid())
);

CREATE POLICY "Admins can delete knowledge base documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'knowledge-base' AND
  is_admin_or_super(auth.uid())
);