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
    const { reportTypeId, userInputs } = await req.json();

    if (!reportTypeId) {
      return new Response(
        JSON.stringify({ error: 'Report type ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OpenAI API key and model from platform settings
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

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not found in settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get report type details
    const { data: reportType, error: reportTypeError } = await supabase
      .from('report_types')
      .select('*')
      .eq('id', reportTypeId)
      .single();

    if (reportTypeError) {
      console.error('Error fetching report type:', reportTypeError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch report type' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get knowledge base documents for this report type
    const { data: kbDocs, error: kbError } = await supabase
      .from('knowledge_base_documents')
      .select('*')
      .eq('report_type_id', reportTypeId);

    if (kbError) {
      console.error('Error fetching knowledge base documents:', kbError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch knowledge base' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build knowledge base context
    const kbContext = kbDocs && kbDocs.length > 0
      ? kbDocs.map((doc: any) => `[${doc.file_name}]\n${doc.content}`).join('\n\n---\n\n')
      : 'No knowledge base documents available.';

    // Build user inputs context
    const userContext = Object.entries(userInputs || {})
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const systemPrompt = `You are an expert inspection report writer. Generate a comprehensive ${reportType.name} report based on the knowledge base examples and user-provided information.

KNOWLEDGE BASE (Previous ${reportType.name} Reports):
${kbContext}

USER PROVIDED INFORMATION:
${userContext}

Generate a detailed, professional inspection report following the style and structure from the knowledge base examples. Include all relevant sections and details. Output the report content as plain text, ready to be used in the report blocks.`;

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
          { role: 'user', content: 'Generate the inspection report now.' }
        ],
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
        JSON.stringify({ error: 'AI generation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content;

    if (!generatedContent) {
      return new Response(
        JSON.stringify({ error: 'No content generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ content: generatedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-report function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});