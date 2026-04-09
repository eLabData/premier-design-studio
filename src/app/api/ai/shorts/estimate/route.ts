import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { estimateCost, costToCredits, SUPER_ADMIN_EMAIL } from '@/lib/shorts-config'
import type { VisualMode, TTSProvider } from '@/types/shorts'

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
      visualMode: VisualMode
      ttsProvider: TTSProvider
      sceneCount?: number
    }

    const { visualMode, ttsProvider, sceneCount = 6 } = body

    const { costUsd, breakdown } = estimateCost(visualMode, ttsProvider, sceneCount)
    const estimatedCredits = costToCredits(costUsd)
    const estimatedDurationSec = Math.ceil(((sceneCount * 17) / 150) * 60)

    if (user.email === SUPER_ADMIN_EMAIL) {
      return NextResponse.json({
        estimatedCredits,
        estimatedDurationSec,
        estimatedCostUsd: costUsd,
        breakdown,
      })
    }

    return NextResponse.json({ estimatedCredits, estimatedDurationSec })
  } catch (err) {
    console.error('[ai/shorts/estimate] erro:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 },
    )
  }
}
