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
    const { reportId } = await req.json();

    if (!reportId) {
      return new Response(
        JSON.stringify({ error: 'Report ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OpenAI settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'openai_model')
      .single();

    if (settingsError || !settingsData?.value) {
      console.error('Error fetching OpenAI settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'OpenAI API not configured. Please configure it in Super Admin Settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = settingsData.value as { model: string; apiKey: string };
    const openaiApiKey = settings.apiKey;
    const openaiModel = settings.model;

    // Get the report with all its blocks
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*, report_blocks(*)')
      .eq('id', reportId)
      .single();

    if (reportError) {
      console.error('Error fetching report:', reportError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get report type if available
    let kbDocs: any[] = [];
    let reportTypeName = 'General';
    
    if (report.report_type_id) {
      const { data: reportType } = await supabase
        .from('report_types')
        .select('name')
        .eq('id', report.report_type_id)
        .single();
      
      if (reportType) {
        reportTypeName = reportType.name;
      }

      // Get knowledge base documents
      const { data: docs } = await supabase
        .from('knowledge_base_documents')
        .select('file_name, content')
        .eq('report_type_id', report.report_type_id);
      
      if (docs) {
        kbDocs = docs;
      }
    }

    // Build the current report content
    const reportBlocks = (report.report_blocks || [])
      .sort((a: any, b: any) => a.order_index - b.order_index);
    
    const reportContent = reportBlocks
      .map((block: any) => {
        if (block.type === 'text') {
          return block.content.text || '';
        } else if (block.type === 'heading') {
          return `\n## ${block.content.text || ''}\n`;
        } else if (block.type === 'checklist') {
          const items = block.content.items || [];
          return items.map((item: any) => `- [${item.checked ? 'x' : ' '}] ${item.text}`).join('\n');
        } else if (block.type === 'notes') {
          return `Notes: ${block.content.text || ''}`;
        }
        return '';
      })
      .join('\n');

    // Build knowledge base context
    const kbContext = kbDocs.length > 0
      ? kbDocs.map((doc: any) => `[${doc.file_name}]\n${doc.content}`).join('\n\n---\n\n')
      : 'No knowledge base documents available for reference.';

    // Build metadata context
    const metadata = `
Report Title: ${report.title}
Report Type: ${reportTypeName}
Client: ${report.client_name || 'N/A'}
Location: ${report.location || 'N/A'}
Inspection Date: ${report.inspection_date || 'N/A'}
Technician: ${report.technician || 'N/A'}
`;

    const systemPrompt = `You are an expert inspection report reviewer and quality assurance specialist. Your task is to review the submitted report and provide:

1. COMPLETENESS CHECK: Identify any missing sections, details, or information that should be included based on the knowledge base examples.

2. CONSISTENCY ANALYSIS: Compare the report structure, terminology, and depth of detail against the knowledge base documents. Note any inconsistencies.

3. ENHANCEMENT SUGGESTIONS: Provide specific recommendations to expand and improve the report content. Include actual text suggestions where appropriate.

4. QUALITY SCORE: Rate the report on a scale of 1-10 based on completeness, professionalism, and alignment with standards.

5. REVISED SECTIONS: For any sections that need significant improvement, provide a revised version of that section.

KNOWLEDGE BASE (Previous ${reportTypeName} Reports for Reference):
${kbContext}

CURRENT REPORT METADATA:
${metadata}

CURRENT REPORT CONTENT:
${reportContent}

Provide your review in the following JSON format:
{
  "qualityScore": <number 1-10>,
  "completenessIssues": ["issue 1", "issue 2", ...],
  "consistencyIssues": ["issue 1", "issue 2", ...],
  "enhancements": [
    {
      "section": "section name",
      "suggestion": "detailed suggestion",
      "revisedContent": "optional revised text"
    }
  ],
  "overallFeedback": "summary of the review"
}`;

    // Call OpenAI API
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Please review this inspection report thoroughly.' }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'OpenAI rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid OpenAI API key. Please update your settings.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI review failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const reviewContent = aiData.choices?.[0]?.message?.content;

    if (!reviewContent) {
      return new Response(
        JSON.stringify({ error: 'No review generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let reviewData;
    try {
      reviewData = JSON.parse(reviewContent);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ review: reviewData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in review-report function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
