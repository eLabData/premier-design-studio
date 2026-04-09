import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

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

function getModule(model: string): string {
  if (UPSCALE_MODELS.has(model)) return 'image_upscale'
  return 'image_edit'
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createSupabaseServer()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = (await req.json()) as {
      prompt?: string
      imageData?: string
      model?: string
      outputFormat?: string
      extraParams?: Record<string, unknown>
    }

    const { prompt, imageData, model = 'kontext-pro', outputFormat = 'png', extraParams } = body

    const falKey = process.env.FAL_AI_KEY
    if (!falKey) {
      return NextResponse.json({ error: 'FAL_AI_KEY nao configurada' }, { status: 500 })
    }

    const modelConfig = FAL_MODELS[model] ?? FAL_MODELS['kontext-pro']
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/fal`

    // Build fal.ai request body
    const falBody: Record<string, unknown> = {
      prompt: prompt ? `${prompt}. IMPORTANT: Do NOT add any text, words, letters, or captions to the image.` : undefined,
      num_images: 1,
      output_format: outputFormat,
      ...extraParams,
    }

    if (imageData) {
      if (model === 'pulid') {
        falBody.reference_image_url = imageData
      } else if (UPSCALE_MODELS.has(model)) {
        falBody.image_url = imageData
        if (model === 'aura-sr') {
          falBody.upscaling_factor = extraParams?.scale ?? 4
          falBody.checkpoint = 'v2'
          falBody.overlapping_tiles = true
        } else if (model !== 'recraft-crisp') {
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

    // Submit to fal.ai queue with webhook
    const response = await fetch(`https://queue.fal.run/${modelConfig.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...falBody,
        fal_webhook: webhookUrl,
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText)
      return NextResponse.json(
        { error: `fal.ai erro ${response.status}: ${errText}` },
        { status: response.status },
      )
    }

    const data = (await response.json()) as { request_id: string }

    // Save job record
    const supabaseAdmin = createSupabaseAdmin()
    const { data: job, error: dbError } = await supabaseAdmin
      .from('ai_jobs')
      .insert({
        user_id: user.id,
        request_id: data.request_id,
        model: modelConfig.id,
        module: getModule(model),
        status: 'processing',
        prompt: prompt ?? null,
        input_url: imageData ?? null,
        metadata: { outputFormat, extraParams },
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('[ai/jobs] db insert error:', dbError)
      return NextResponse.json({ error: 'Erro ao salvar job' }, { status: 500 })
    }

    return NextResponse.json({ jobId: job.id, requestId: data.request_id })
  } catch (err) {
    console.error('[ai/jobs] erro:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}

export async function GET(req: Request) {
  try {
    const supabaseAuth = await createSupabaseServer()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    const supabaseAdmin = createSupabaseAdmin()

    if (id) {
      const { data: job, error } = await supabaseAdmin
        .from('ai_jobs')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error || !job) {
        return NextResponse.json({ error: 'Job nao encontrado' }, { status: 404 })
      }
      return NextResponse.json(job)
    }

    // List recent jobs
    const { data: jobs, error } = await supabaseAdmin
      .from('ai_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar jobs' }, { status: 500 })
    }

    return NextResponse.json({ jobs })
  } catch (err) {
    console.error('[ai/jobs] erro:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
