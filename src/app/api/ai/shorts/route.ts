import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { generateScript, scenesToShortScenes } from '@/lib/shorts/generate-script'
import { generateNarration } from '@/lib/shorts/generate-narration'
import { generateVisuals } from '@/lib/shorts/generate-visuals'
import { generatePlatformMetadata } from '@/lib/shorts/generate-metadata'
import { SUPER_ADMIN_EMAIL } from '@/lib/shorts-config'
import type { CreateShortRequest, ShortRecord, ShortScene, CostBreakdown } from '@/types/shorts'

const FPS = 30

async function processShort(shortId: string, userId: string, body: CreateShortRequest) {
  const supabase = createSupabaseAdmin()
  const openRouterKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? ''
  const falKey = process.env.FAL_AI_KEY ?? ''

  const costBreakdown: CostBreakdown = {
    script: 0,
    tts: 0,
    images: 0,
    video_clips: 0,
    composition: 0,
    metadata: 0,
    total: 0,
  }

  try {
    // Step 1: generating_script
    let title: string
    let scenes: ShortScene[]
    let fullScript: string

    if (body.customScript) {
      // Split customScript into 6 scenes
      const sentences = body.customScript.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean)
      const chunkSize = Math.ceil(sentences.length / 6)
      const rawScenes = Array.from({ length: 6 }, (_, i) => {
        const chunk = sentences.slice(i * chunkSize, (i + 1) * chunkSize)
        return {
          narration: chunk.join('. '),
          imagePrompt: `Cinematic scene for: ${chunk.join(' ')}`,
          motion: 'ken-burns' as const,
        }
      }).filter((s) => s.narration.trim())

      title = body.topic
      fullScript = body.customScript
      const totalDuration = body.format === 'short' ? 35 : 90
      scenes = scenesToShortScenes(rawScenes, FPS, totalDuration)
      costBreakdown.script = 0
    } else {
      const result = await generateScript(body.topic, body.language, body.format, openRouterKey)
      title = result.title
      fullScript = result.fullScript
      const totalDuration = body.format === 'short' ? 35 : 90
      scenes = scenesToShortScenes(result.scenes, FPS, totalDuration)
      costBreakdown.script = 0.01
    }

    await supabase
      .from('shorts')
      .update({
        title,
        script: fullScript,
        scenes,
        status: 'generating_audio',
        cost_breakdown: costBreakdown,
      })
      .eq('id', shortId)

    // Step 2: generating_audio
    const narration = await generateNarration(fullScript, body.ttsProvider, body.language, falKey, openRouterKey)
    costBreakdown.tts = narration.costUsd

    // Recalculate scene durations from actual audio length
    const framesPerScene = Math.floor((narration.durationSec * FPS) / scenes.length)
    const updatedScenes: ShortScene[] = scenes.map((scene, i) => ({
      ...scene,
      durationFrames: framesPerScene,
      startFrame: i * framesPerScene,
    }))

    // Build captions array from scenes
    const captions = updatedScenes.map((scene) => ({
      text: scene.text,
      startFrame: scene.startFrame,
      endFrame: scene.startFrame + scene.durationFrames,
    }))

    await supabase
      .from('shorts')
      .update({
        narration_url: narration.audioUrl,
        scenes: updatedScenes,
        captions,
        status: 'generating_visuals',
        cost_breakdown: { ...costBreakdown, total: costBreakdown.script + costBreakdown.tts },
      })
      .eq('id', shortId)

    // Step 3: generating_visuals
    const visuals = await generateVisuals(updatedScenes, body.visualMode, body.format, falKey)
    const scenesWithImages = visuals.scenes

    // Split cost between images and video_clips based on what was generated
    const imageScenes = scenesWithImages.filter((s) => s.imageUrl && !s.videoUrl).length
    const videoScenes = scenesWithImages.filter((s) => s.videoUrl).length
    costBreakdown.images = imageScenes * 0.003
    costBreakdown.video_clips = videoScenes * 0.8

    await supabase
      .from('shorts')
      .update({
        scenes: scenesWithImages,
        status: 'composing',
        cost_breakdown: {
          ...costBreakdown,
          total: costBreakdown.script + costBreakdown.tts + costBreakdown.images + costBreakdown.video_clips,
        },
      })
      .eq('id', shortId)

    // Step 4: composing — skip Remotion render for MVP
    await supabase
      .from('shorts')
      .update({ status: 'generating_metadata' })
      .eq('id', shortId)

    // Step 5: generating_metadata
    const metaResult = await generatePlatformMetadata(title, fullScript, body.language, openRouterKey)
    costBreakdown.metadata = metaResult.costUsd
    costBreakdown.total =
      costBreakdown.script +
      costBreakdown.tts +
      costBreakdown.images +
      costBreakdown.video_clips +
      costBreakdown.composition +
      costBreakdown.metadata

    await supabase
      .from('shorts')
      .update({
        platform_metadata: metaResult.metadata,
        cost_usd: costBreakdown.total,
        cost_breakdown: costBreakdown,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', shortId)
  } catch (err) {
    console.error('[shorts/processShort] error:', err)
    await supabase
      .from('shorts')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
      })
      .eq('id', shortId)
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createSupabaseServer()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = (await req.json()) as CreateShortRequest

    const supabase = createSupabaseAdmin()
    const { data: short, error: insertError } = await supabase
      .from('shorts')
      .insert({
        user_id: user.id,
        topic: body.topic,
        language: body.language,
        format: body.format,
        visual_mode: body.visualMode,
        tts_provider: body.ttsProvider,
        caption_style: body.captionStyle ?? 'default',
        status: 'generating_script',
        title: body.topic,
        scenes: [],
        captions: [],
        platform_metadata: {},
        cost_usd: 0,
        cost_breakdown: {},
        credits_charged: 0,
      })
      .select('id, status')
      .single()

    if (insertError || !short) {
      console.error('[shorts] insert error:', insertError)
      return NextResponse.json({ error: 'Erro ao criar short' }, { status: 500 })
    }

    // Fire-and-forget async pipeline
    processShort(short.id, user.id, body).catch((err) => {
      console.error('[shorts] processShort unhandled:', err)
    })

    return NextResponse.json({ shortId: short.id, status: short.status })
  } catch (err) {
    console.error('[shorts] POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}

export async function GET(req: Request) {
  try {
    const supabaseAuth = await createSupabaseServer()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createSupabaseAdmin()
    const { data: shorts, error } = await supabase
      .from('shorts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar shorts' }, { status: 500 })
    }

    const isAdmin = user.email === SUPER_ADMIN_EMAIL
    const result = isAdmin
      ? shorts
      : (shorts as ShortRecord[]).map(({ cost_usd, cost_breakdown, ...rest }) => rest)

    return NextResponse.json({ shorts: result })
  } catch (err) {
    console.error('[shorts] GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
