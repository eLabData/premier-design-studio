import { NextResponse } from 'next/server'

const SYSTEM_PROMPTS: Record<string, string> = {
  video:
    'Voce e um editor de video profissional assistente. Ajude o usuario a editar videos: sugira cortes, legendas, efeitos, transicoes, B-roll. Seja conciso e pratico. Responda em portugues.',
  designer:
    'Voce e um designer grafico profissional. Ajude a criar posts para redes sociais: sugira textos, cores, layouts, fontes, composicoes. Quando possivel, sugira acoes concretas que possam ser aplicadas no canvas. Responda em portugues.',
  photo:
    'Voce e um editor de fotos e gerador de imagens profissional. Ajude a editar fotos: sugira filtros, ajustes de cor, crop, remocao de fundo, retoque. Quando o usuario pedir pra gerar uma imagem, descreva-a detalhadamente. Responda em portugues.',
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      messages: { role: string; content: unknown }[]
      context: string
    }

    const { messages, context } = body

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages invalidas' }, { status: 400 })
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY ?? process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? ''

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chave de API do OpenRouter nao configurada.' },
        { status: 500 }
      )
    }

    const systemPrompt = SYSTEM_PROMPTS[context] ?? SYSTEM_PROMPTS.photo

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': 'Premier Design Studio',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 2000,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      return NextResponse.json(
        { error: `OpenRouter erro ${response.status}: ${errorText}` },
        { status: response.status }
      )
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }

    return NextResponse.json({
      content: data.choices?.[0]?.message?.content ?? 'Erro ao processar.',
      usage: data.usage,
    })
  } catch (err) {
    console.error('[ai/chat] erro:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 }
    )
  }
}
