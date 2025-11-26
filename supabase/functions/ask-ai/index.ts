import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { questionText } = await req.json()
    
    // Debug: Check environment variables (safely)
    const key1 = Deno.env.get('google_ai_studio');
    const key2 = Deno.env.get('GOOGLE_AI_STUDIO');
    const key3 = Deno.env.get('GEMINI_API_KEY');
    const key4 = Deno.env.get('GOOGLE_API_KEY'); // Add another common one
    
    const apiKey = key1 || key2 || key3 || key4;

    if (!apiKey) {
      // Return 200 with error to make it visible to client
      return new Response(
        JSON.stringify({ error: 'Missing Google AI API Key. Secrets checked: google_ai_studio, GOOGLE_AI_STUDIO, GEMINI_API_KEY, GOOGLE_API_KEY' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!questionText) {
      return new Response(
        JSON.stringify({ error: 'Missing questionText in request body.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const prompt = `你是一个计算机科学专家辅助助手。
请根据以下题目的文本内容，简要概括这道题的核心考点（Key Concepts）和内容摘要（Content Summary）。
请用中文回答，字数控制在100字以内，保持简洁明了。

题目内容：
${questionText}`;

    // Try models in order of preference
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-pro'];
    let lastError = null;
    let data = null;

    for (const model of models) {
        console.log(`Attempting model: ${model}...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            data = await response.json();

            if (response.ok) {
                console.log(`Success with model: ${model}`);
                break; // Success!
            } else {
                console.warn(`Model ${model} failed: ${data.error?.message}`);
                lastError = data;
                // If 404, continue to next model. If 403/400, maybe stop? 
                // Let's try next anyway.
            }
        } catch (e) {
            console.error(`Network error with ${model}:`, e);
            lastError = { error: { message: e.message } };
        }
    }

    if (!data || data.error) {
        return new Response(
            JSON.stringify({ error: `All models failed. Last error: ${lastError?.error?.message || 'Unknown'}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI 无法生成回答 (No text returned).";

    return new Response(
      JSON.stringify({ answer: aiText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    // Return generic logic error as 200 OK json
    return new Response(
      JSON.stringify({ 
        error: `Edge Function Logic Error: ${error.message}`,
        stack: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // FORCE 200 TO SEE ERROR IN FRONTEND
      }
    )
  }
})