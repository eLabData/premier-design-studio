import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { generateNarration } from '@/lib/shorts/generate-narration'

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createSupabaseServer()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { shortId, text, language } = await req.json()
    if (!shortId || !text) {
      return NextResponse.json({ error: 'shortId and text required' }, { status: 400 })
    }

    const falKey = process.env.FAL_AI_KEY
    const openRouterKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
    if (!falKey) {
      return NextResponse.json({ error: 'FAL_AI_KEY not configured' }, { status: 500 })
    }

    // Verify ownership
    const supabase = createSupabaseAdmin()
    const { data: short } = await supabase
      .from('shorts')
      .select('id, user_id')
      .eq('id', shortId)
      .eq('user_id', user.id)
      .single()

    if (!short) {
      return NextResponse.json({ error: 'Short nao encontrado' }, { status: 404 })
    }

    // Generate new narration
    const narration = await generateNarration(text, 'fal_ai', language || 'pt-br', falKey, openRouterKey || '')

    // Update DB
    await supabase
      .from('shorts')
      .update({ narration_url: narration.audioUrl })
      .eq('id', shortId)

    return NextResponse.json({
      narration_url: narration.audioUrl,
      duration_sec: narration.durationSec,
      cost_usd: narration.costUsd,
    })
  } catch (err) {
    console.error('[regenerate-audio]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
