import { NextResponse } from 'next/server'

const FAL_MODELS: Record<string, { id: string; costUsd: number }> = {
  'kontext-pro': { id: 'fal-ai/flux-pro/kontext', costUsd: 0.05 },
  'kontext-dev': { id: 'fal-ai/flux-kontext/dev', costUsd: 0.025 },
  'pulid': { id: 'fal-ai/flux-pulid', costUsd: 0.05 },
  'creative-upscaler': { id: 'fal-ai/creative-upscaler', costUsd: 0.04 },
  'real-esrgan': { id: 'fal-ai/real-esrgan', costUsd: 0.01 },
  'aura-sr': { id: 'fal-ai/aura-sr', costUsd: 0.005 },
  'recraft-crisp': { id: 'fal-ai/recraft/upscale/crisp', costUsd: 0.004 },
  'schnell': { id: 'fal-ai/flux/schnell', costUsd: 0.003 },
}

const UPSCALE_MODELS = new Set(['real-esrgan', 'creative-upscaler', 'aura-sr', 'recraft-crisp'])

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const useAsync = searchParams.get('async') === 'true'

    const body = (await req.json()) as {
      prompt: string
      imageData?: string
      model?: string
      outputFormat?: string
      extraParams?: Record<string, unknown>
    }

    const { prompt, imageData, model = 'kontext-pro', outputFormat = 'png', extraParams } = body

    if (!prompt && !UPSCALE_MODELS.has(model)) {
      return NextResponse.json({ error: 'prompt obrigatorio' }, { status: 400 })
    }

    // Async mode: delegate to queue + webhook via /api/ai/jobs
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

    const modelConfig = FAL_MODELS[model] ?? FAL_MODELS['kontext-pro']

    // Build request body based on model type
    const falBody: Record<string, unknown> = {
      prompt: `${prompt}. IMPORTANT: Do NOT add any text, words, letters, or captions to the image.`,
      num_images: 1,
      output_format: outputFormat,
      ...extraParams,
    }

    // Models that take image input
    if (imageData) {
      if (model === 'pulid') {
        falBody.reference_image_url = imageData
      } else if (UPSCALE_MODELS.has(model)) {
        falBody.image_url = imageData
        if (model === 'aura-sr') {
          falBody.upscaling_factor = extraParams?.scale ?? 4
          falBody.checkpoint = 'v2'
          falBody.overlapping_tiles = true
        } else if (model === 'recraft-crisp') {
          // recraft only needs image_url — strip everything else
          delete falBody.scale
        } else {
          falBody.scale = extraParams?.scale ?? 2
        }
        delete falBody.prompt
        delete falBody.num_images
        delete falBody.output_format
      } else {
        falBody.image_url = imageData
        falBody.safety_tolerance = '5'
        falBody.guidance_scale = 3.0
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

    // fal.ai returns either images[] or image{}
    const resultImage = data.images?.[0] ?? data.image
    if (!resultImage?.url) {
      return NextResponse.json({ error: 'Nenhuma imagem retornada' }, { status: 500 })
    }

    return NextResponse.json({
      imageUrl: resultImage.url,
      width: resultImage.width,
      height: resultImage.height,
      usage: {
        model: modelConfig.id,
        provider: 'fal_ai',
        costUsd: modelConfig.costUsd * billableUnits,
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
