import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

type LipsyncMode = 'avatar' | 'dub'

type ModelConfig = {
  id: string
  mode: LipsyncMode
  // pricing
  perSecondUsd?: number  // avatar models: charged per output second
  perMinuteUsd?: number  // dub models: charged per minute of video
  resolution?: '480p' | '720p'
}

const LIPSYNC_MODELS: Record<string, ModelConfig> = {
  // Avatar: image + audio -> talking video
  'veed-fabric-480': { id: 'veed/fabric-1.0', mode: 'avatar', perSecondUsd: 0.08, resolution: '480p' },
  'veed-fabric-720': { id: 'veed/fabric-1.0', mode: 'avatar', perSecondUsd: 0.15, resolution: '720p' },
  'omnihuman-v1.5': { id: 'fal-ai/bytedance/omnihuman/v1.5', mode: 'avatar', perSecondUsd: 0.16 },

  // Dub: video + audio -> lipsynced video
  'sync-v2': { id: 'fal-ai/sync-lipsync/v2', mode: 'dub', perMinuteUsd: 3 },
  'heygen-speed': { id: 'fal-ai/heygen/v3/lipsync/speed', mode: 'dub', perMinuteUsd: 2 },
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = (await req.json()) as {
      model: string
      image_url?: string
      video_url?: string
      audio_url: string
    }

    const { model, image_url, video_url, audio_url } = body
    const cfg = LIPSYNC_MODELS[model]
    if (!cfg) {
      return NextResponse.json({ error: `Modelo invalido: ${model}` }, { status: 400 })
    }
    if (!audio_url) {
      return NextResponse.json({ error: 'audio_url obrigatorio' }, { status: 400 })
    }
    if (cfg.mode === 'avatar' && !image_url) {
      return NextResponse.json({ error: 'image_url obrigatorio para modo avatar' }, { status: 400 })
    }
    if (cfg.mode === 'dub' && !video_url) {
      return NextResponse.json({ error: 'video_url obrigatorio para modo dublagem' }, { status: 400 })
    }

    const falKey = process.env.FAL_AI_KEY
    if (!falKey) {
      return NextResponse.json({ error: 'FAL_AI_KEY nao configurada' }, { status: 500 })
    }

    const falBody: Record<string, unknown> = {
      audio_url,
    }
    if (cfg.mode === 'avatar') {
      falBody.image_url = image_url
      if (cfg.resolution) falBody.resolution = cfg.resolution
    } else {
      falBody.video_url = video_url
    }

    const startMs = Date.now()
    const response = await fetch(`https://fal.run/${cfg.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(falBody),
    })
    const durationMs = Date.now() - startMs

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText)
      return NextResponse.json(
        { error: `fal.ai erro ${response.status}: ${errText}` },
        { status: response.status },
      )
    }

    const data = (await response.json()) as {
      video?: { url: string; duration?: number } | string
      output?: { url: string; duration?: number }
      duration?: number
    }

    const videoResult = typeof data.video === 'string' ? { url: data.video } : (data.video ?? data.output)
    const videoUrl = videoResult?.url
    if (!videoUrl) {
      return NextResponse.json({ error: 'Nenhum video retornado' }, { status: 500 })
    }

    const outputSeconds = videoResult?.duration ?? data.duration ?? 0
    let costUsd = 0
    if (cfg.perSecondUsd && outputSeconds) costUsd = cfg.perSecondUsd * outputSeconds
    else if (cfg.perMinuteUsd && outputSeconds) costUsd = (cfg.perMinuteUsd * outputSeconds) / 60

    return NextResponse.json({
      videoUrl,
      durationSec: outputSeconds,
      usage: {
        model: cfg.id,
        provider: 'fal_ai',
        mode: cfg.mode,
        resolution: cfg.resolution,
        costUsd: Math.round(costUsd * 10000) / 10000,
        durationMs,
      },
    })
  } catch (err) {
    console.error('[ai/lipsync] erro:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
