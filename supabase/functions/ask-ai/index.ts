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
    const { questionText, userPrompt, imageBase64, mimeType } = await req.json()
    
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

    if (!questionText && !userPrompt && !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Request must contain at least questionText, userPrompt, or imageBase64.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let fullText = `你是一个乐于助人的AI助手。
请根据提供的上下文信息（如果有）、用户的问题或上传的图片进行回答。请用中文回答。

`;

    if (questionText) {
        fullText += `相关题目/背景文本（供参考）：
${questionText}

`;
    }

    if (userPrompt) {
        fullText += `用户的问题：
${userPrompt}`;
    } else if (imageBase64) {
        // User uploaded an image but didn't type a specific question.
        fullText += `任务：
请详细描述并分析这张图片的内容。`;
    } else {
        // No prompt and no image, just context text.
        fullText += `任务：
请简要概括核心考点（Key Concepts）和内容摘要。`;
    }

    // Construct parts
    const parts: any[] = [{ text: fullText }];

    if (imageBase64) {
        parts.push({
            inline_data: {
                mime_type: mimeType || 'image/png',
                data: imageBase64
            }
        });
    }

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
                    contents: [{ parts: parts }]
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