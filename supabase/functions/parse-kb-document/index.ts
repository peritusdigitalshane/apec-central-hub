import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath, reportTypeId, fileName, fileType } = await req.json();

    if (!filePath || !reportTypeId || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('knowledge-base')
      .download(filePath);

    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let extractedContent = '';

    // Extract content based on file type
    if (fileType === 'txt' || fileType === 'md') {
      extractedContent = await fileData.text();
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      // For Excel files, extract text from cells
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        
        // Excel (.xlsx) files are ZIP archives containing XML
        // Extract text from shared strings and worksheet data
        const sharedStrings: string[] = [];
        const sheetData: string[] = [];
        
        // Extract shared strings (common text values)
        const sharedStringsMatch = text.match(/<sst[^>]*>[\s\S]*?<\/sst>/);
        if (sharedStringsMatch) {
          const matches = sharedStringsMatch[0].match(/<t[^>]*>([^<]+)<\/t>/g);
          if (matches) {
            sharedStrings.push(...matches.map(m => m.replace(/<t[^>]*>|<\/t>/g, '')));
          }
        }
        
        // Extract inline cell values
        const cellMatches = text.match(/<v>([^<]+)<\/v>/g);
        if (cellMatches) {
          sheetData.push(...cellMatches.map(m => m.replace(/<v>|<\/v>/g, '')));
        }
        
        // Extract inline string values
        const inlineStrings = text.match(/<is>[\s\S]*?<t[^>]*>([^<]+)<\/t>[\s\S]*?<\/is>/g);
        if (inlineStrings) {
          inlineStrings.forEach(match => {
            const textMatch = match.match(/<t[^>]*>([^<]+)<\/t>/);
            if (textMatch) {
              sheetData.push(textMatch[1]);
            }
          });
        }
        
        // Combine all extracted content
        const allContent = [...sharedStrings, ...sheetData].filter(Boolean);
        if (allContent.length > 0) {
          extractedContent = allContent.join(' ');
        } else {
          extractedContent = `Excel document: ${fileName}. Please note: Complex Excel files may require manual content extraction.`;
        }
      } catch (error) {
        console.error('Excel extraction error:', error);
        extractedContent = `Excel document: ${fileName}. Automatic text extraction failed.`;
      }
    } else if (fileType === 'pdf') {
      // For PDF files, use a simple text extraction approach
      // In production, you might want to use a dedicated PDF parsing library
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        // Very basic PDF text extraction - extracts visible text between parentheses
        const matches = text.match(/\(([^)]+)\)/g);
        if (matches) {
          extractedContent = matches.map(m => m.slice(1, -1)).join(' ');
        } else {
          extractedContent = `PDF document: ${fileName}. Please note: Complex PDFs may require manual content extraction.`;
        }
      } catch (error) {
        console.error('PDF extraction error:', error);
        extractedContent = `PDF document: ${fileName}. Automatic text extraction failed.`;
      }
    } else if (fileType === 'docx') {
      // For DOCX files, basic text extraction
      // DOCX is a ZIP file containing XML. We'll extract text from document.xml
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        // Basic DOCX text extraction from XML content
        const xmlMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
        if (xmlMatches) {
          extractedContent = xmlMatches
            .map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, ''))
            .join(' ');
        } else {
          extractedContent = `DOCX document: ${fileName}. Please note: Complex documents may require manual content extraction.`;
        }
      } catch (error) {
        console.error('DOCX extraction error:', error);
        extractedContent = `DOCX document: ${fileName}. Automatic text extraction failed.`;
      }
    } else {
      extractedContent = `Document: ${fileName}. File type ${fileType} not supported for automatic text extraction. Supported formats: TXT, MD, PDF, DOCX, XLSX, XLS.`;
    }

    // Clean up the extracted content
    extractedContent = extractedContent
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n]/g, '')
      .trim();

    if (!extractedContent || extractedContent.length < 10) {
      extractedContent = `Document: ${fileName}. Content could not be automatically extracted. Please ensure the document contains readable text.`;
    }

    return new Response(
      JSON.stringify({ content: extractedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in parse-kb-document function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
