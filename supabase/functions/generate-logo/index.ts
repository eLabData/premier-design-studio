import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { conversationHistory, mode } = await req.json()
    // mode: 'create' | 'suggest'

    const systemPrompt = mode === 'create'
      ? `Voce e um designer de logos expert. Crie logos profissionais baseado na descricao do usuario. Responda em portugues. Descreva o logo detalhadamente e sugira variacoes.`
      : `Voce e um critico de design. Analise o logo/descricao fornecida e sugira melhorias especificas. Responda em portugues.`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m: any) => ({
        role: m.role,
        content: m.imageData
          ? [
              { type: 'text', text: m.content },
              { type: 'image_url', image_url: { url: m.imageData } },
            ]
          : m.content,
      })),
    ]

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://premier-design-studio.app',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-20250514',
        messages,
        max_tokens: 2000,
      }),
    })

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''

    return new Response(
      JSON.stringify({ text, suggestions: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
