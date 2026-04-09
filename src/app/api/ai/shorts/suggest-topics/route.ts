import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as {
      niche?: string
      language?: string
      count?: number
    }

    const { niche = 'tech', language = 'en', count = 5 } = body

    const apiKey =
      process.env.OPENROUTER_API_KEY ?? process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? ''

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chave de API do OpenRouter nao configurada.' },
        { status: 500 },
      )
    }

    const prompt = `Suggest ${count} viral short video topic ideas about "${niche}" in language "${language}". Return ONLY a valid JSON array of strings, with no additional text. Example: ["Topic 1", "Topic 2"]`

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
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      return NextResponse.json(
        { error: `OpenRouter erro ${response.status}: ${errorText}` },
        { status: response.status },
      )
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }

    const content = data.choices?.[0]?.message?.content ?? '[]'

    let topics: string[] = []
    try {
      topics = JSON.parse(content) as string[]
    } catch {
      // Fallback: try to extract array from text
      const match = content.match(/\[[\s\S]*\]/)
      if (match) {
        topics = JSON.parse(match[0]) as string[]
      }
    }

    return NextResponse.json({ topics })
  } catch (err) {
    console.error('[ai/shorts/suggest-topics] erro:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 },
    )
  }
}
