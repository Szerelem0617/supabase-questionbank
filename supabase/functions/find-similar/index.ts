import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Create Supabase Client with Service Role Key (Admin privileges)
    // This allows us to read tables even if RLS is set to 'no one' for public.
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 2. Parse request body
    const { question_id } = await req.json()

    if (!question_id) {
      throw new Error('Missing question_id in request body')
    }

    // 3. Fetch the source question's vector and metadata securely on the server
    // The client NEVER sees this vector.
    const { data: sourceData, error: sourceError } = await supabase
      .from('questions_data')
      .select('ms_vector, paper_filename, id')
      .eq('id', question_id)
      .single()

    if (sourceError) throw sourceError
    if (!sourceData) throw new Error('Question not found')

    // 4. Call the RPC function to find similar questions using the vector
    // Note: We are still using the existing RPC, but invoking it from the server side.
    const { data: similarData, error: rpcError } = await supabase.rpc('match_similar_question', {
      current_vector: sourceData.ms_vector,
      current_paper: sourceData.paper_filename,
      current_id: sourceData.id
    })

    if (rpcError) throw rpcError

    // 5. Return the result (only the safe data, no vectors!)
    // We return the top match if available.
    const bestMatch = similarData && similarData.length > 0 ? similarData[0] : null

    return new Response(
      JSON.stringify({ match: bestMatch }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})