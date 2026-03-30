import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { conversationHistory, mode, screenshotCount } = await req.json()
    // modes: 'mockup' | 'metadata' | 'all' | 'suggest-captions' | 'edit-mockup'

    let systemPrompt = ''
    switch (mode) {
      case 'mockup':
        systemPrompt = 'Voce e um designer de App Store. Crie descricoes detalhadas de mockups profissionais para screenshots de app. Sugira layouts, cores e composicao. Responda em portugues.'
        break
      case 'metadata':
        systemPrompt = 'Voce e um especialista em ASO (App Store Optimization). Gere metadata otimizada para App Store/Google Play. Inclua: appName, subtitle, description, keywords, whatsNew, category, promotionalText. Responda em JSON e portugues.'
        break
      case 'all':
        systemPrompt = 'Voce e um especialista em App Store marketing. Gere tanto mockup descriptions quanto metadata completa. Responda em JSON com campos: text (descricao), storeData (metadata object). Portugues.'
        break
      case 'suggest-captions':
        systemPrompt = `Voce e um copywriter de App Store. Sugira ${screenshotCount || 5} frases curtas e impactantes para screenshots de app. Responda em JSON: { "captions": ["frase1", "frase2", ...] }. Portugues.`
        break
      case 'edit-mockup':
        systemPrompt = 'Voce e um designer. O usuario quer editar um mockup existente. Descreva as alteracoes a fazer baseado no pedido. Responda em portugues.'
        break
    }

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
        max_tokens: 3000,
      }),
    })

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''

    // Try to parse storeData and captions from response
    let storeData = null
    let captions = null
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.captions) captions = parsed.captions
        if (parsed.appName || parsed.subtitle) storeData = parsed
        if (parsed.storeData) storeData = parsed.storeData
      }
    } catch { /* not JSON, just text */ }

    return new Response(
      JSON.stringify({ text, storeData, captions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
