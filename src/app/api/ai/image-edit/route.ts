import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

type ModelConfig = {
  id: string
  costUsd: number
  kind: 'edit' | 't2i-size' | 't2i-aspect' | 't2i-recraft' | 'upscale' | 'pulid'
}

const FAL_MODELS: Record<string, ModelConfig> = {
  // Edit models (take image_url + prompt)
  'kontext-pro': { id: 'fal-ai/flux-pro/kontext', costUsd: 0.05, kind: 'edit' },
  'kontext-dev': { id: 'fal-ai/flux-kontext/dev', costUsd: 0.025, kind: 'edit' },

  // Text-to-image: image_size { width, height }
  'schnell': { id: 'fal-ai/flux/schnell', costUsd: 0.003, kind: 't2i-size' },
  'flux-dev': { id: 'fal-ai/flux/dev', costUsd: 0.025, kind: 't2i-size' },

  // Text-to-image: aspect_ratio string
  'ideogram-v3': { id: 'fal-ai/ideogram/v3', costUsd: 0.06, kind: 't2i-aspect' },
  'nano-banana-pro': { id: 'fal-ai/nano-banana-pro', costUsd: 0.15, kind: 't2i-aspect' },

  // Recraft uses `size` enum + `style`
  'recraft-v3': { id: 'fal-ai/recraft/v3/text-to-image', costUsd: 0.04, kind: 't2i-recraft' },

  // Reference-driven (PuLID)
  'pulid': { id: 'fal-ai/flux-pulid', costUsd: 0.05, kind: 'pulid' },

  // Upscalers (take image_url only)
  'creative-upscaler': { id: 'fal-ai/creative-upscaler', costUsd: 0.04, kind: 'upscale' },
  'real-esrgan': { id: 'fal-ai/real-esrgan', costUsd: 0.01, kind: 'upscale' },
  'aura-sr': { id: 'fal-ai/aura-sr', costUsd: 0.005, kind: 'upscale' },
  'recraft-crisp': { id: 'fal-ai/recraft/upscale/crisp', costUsd: 0.004, kind: 'upscale' },
}

function sizeToAspectRatio(image_size?: { width: number; height: number }): string {
  if (!image_size) return '9:16'
  const { width, height } = image_size
  if (width === height) return '1:1'
  if (width > height) {
    const r = width / height
    if (Math.abs(r - 16 / 9) < 0.05) return '16:9'
    if (Math.abs(r - 4 / 3) < 0.05) return '4:3'
    if (Math.abs(r - 3 / 2) < 0.05) return '3:2'
    return '16:9'
  }
  const r = height / width
  if (Math.abs(r - 16 / 9) < 0.05) return '9:16'
  if (Math.abs(r - 4 / 3) < 0.05) return '3:4'
  if (Math.abs(r - 3 / 2) < 0.05) return '2:3'
  return '9:16'
}

function sizeToRecraftSize(image_size?: { width: number; height: number }): string {
  if (!image_size) return 'portrait_16_9'
  const { width, height } = image_size
  if (width === height) return 'square_hd'
  if (height > width) {
    const r = height / width
    if (Math.abs(r - 16 / 9) < 0.05) return 'portrait_16_9'
    return 'portrait_4_3'
  }
  const r = width / height
  if (Math.abs(r - 16 / 9) < 0.05) return 'landscape_16_9'
  return 'landscape_4_3'
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const useAsync = searchParams.get('async') === 'true'

    const body = (await req.json()) as {
      prompt: string
      imageData?: string
      model?: string
      outputFormat?: string
      image_size?: { width: number; height: number }
      extraParams?: Record<string, unknown>
    }

    const { prompt, imageData, model = 'kontext-pro', outputFormat = 'png', image_size, extraParams } = body

    const modelConfig = FAL_MODELS[model] ?? FAL_MODELS['kontext-pro']

    if (!prompt && modelConfig.kind !== 'upscale') {
      return NextResponse.json({ error: 'prompt obrigatorio' }, { status: 400 })
    }

    if (useAsync) {
      const jobsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/ai/jobs`
      const jobRes = await fetch(jobsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: req.headers.get('cookie') ?? '',
        },
        body: JSON.stringify(body),
      })
      const jobData = await jobRes.json()
      if (!jobRes.ok) {
        return NextResponse.json(jobData, { status: jobRes.status })
      }
      return NextResponse.json({ async: true, ...jobData })
    }

    const falKey = process.env.FAL_AI_KEY
    if (!falKey) {
      return NextResponse.json({ error: 'FAL_AI_KEY nao configurada' }, { status: 500 })
    }

    const safePrompt = `${prompt}. IMPORTANT: Do NOT add any text, words, letters, or captions to the image.`
    const falBody: Record<string, unknown> = {}

    switch (modelConfig.kind) {
      case 'edit': {
        falBody.prompt = safePrompt
        falBody.num_images = 1
        falBody.output_format = outputFormat
        if (imageData) {
          falBody.image_url = imageData
          falBody.safety_tolerance = '5'
          falBody.guidance_scale = 3.0
        }
        if (image_size) falBody.image_size = image_size
        Object.assign(falBody, extraParams ?? {})
        break
      }
      case 't2i-size': {
        falBody.prompt = safePrompt
        falBody.num_images = 1
        falBody.output_format = outputFormat
        if (image_size) falBody.image_size = image_size
        Object.assign(falBody, extraParams ?? {})
        break
      }
      case 't2i-aspect': {
        falBody.prompt = safePrompt
        falBody.num_images = 1
        falBody.aspect_ratio = sizeToAspectRatio(image_size)
        Object.assign(falBody, extraParams ?? {})
        break
      }
      case 't2i-recraft': {
        falBody.prompt = safePrompt
        falBody.size = sizeToRecraftSize(image_size)
        falBody.style = (extraParams?.style as string) ?? 'realistic_image'
        break
      }
      case 'pulid': {
        falBody.prompt = safePrompt
        falBody.num_images = 1
        falBody.output_format = outputFormat
        if (imageData) falBody.reference_image_url = imageData
        if (image_size) falBody.image_size = image_size
        Object.assign(falBody, extraParams ?? {})
        break
      }
      case 'upscale': {
        if (!imageData) {
          return NextResponse.json({ error: 'image obrigatoria para upscale' }, { status: 400 })
        }
        falBody.image_url = imageData
        if (model === 'aura-sr') {
          falBody.upscaling_factor = extraParams?.scale ?? 4
          falBody.checkpoint = 'v2'
          falBody.overlapping_tiles = true
        } else if (model !== 'recraft-crisp') {
          falBody.scale = extraParams?.scale ?? 2
        }
        break
      }
    }

    const startMs = Date.now()

    const response = await fetch(`https://fal.run/${modelConfig.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(falBody),
    })

    const durationMs = Date.now() - startMs
    const billableUnits = parseInt(response.headers.get('x-fal-billable-units') ?? '1', 10)
    const requestId = response.headers.get('x-fal-request-id') ?? ''

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText)
      return NextResponse.json(
        { error: `fal.ai erro ${response.status}: ${errText}` },
        { status: response.status },
      )
    }

    const data = (await response.json()) as {
      images?: { url: string; width: number; height: number }[]
      image?: { url: string; width: number; height: number }
      timings?: { inference: number }
      seed?: number
    }

    const resultImage = data.images?.[0] ?? data.image
    if (!resultImage?.url) {
      return NextResponse.json({ error: 'Nenhuma imagem retornada' }, { status: 500 })
    }

    // Recraft vector style charges 2x
    let effectiveCost = modelConfig.costUsd
    if (model === 'recraft-v3' && extraParams?.style === 'vector_illustration') {
      effectiveCost *= 2
    }

    return NextResponse.json({
      imageUrl: resultImage.url,
      width: resultImage.width,
      height: resultImage.height,
      usage: {
        model: modelConfig.id,
        provider: 'fal_ai',
        costUsd: effectiveCost * billableUnits,
        billableUnits,
        durationMs,
        inferenceMs: Math.round((data.timings?.inference ?? 0) * 1000),
        requestId,
        seed: data.seed,
      },
    })
  } catch (err) {
    console.error('[ai/image-edit] erro:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
