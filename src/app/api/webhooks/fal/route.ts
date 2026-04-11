import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

/** Cached JWKS public keys */
let cachedJwks: { keys: { kid: string; x: string }[] } | null = null
let jwksFetchedAt = 0
const JWKS_TTL_MS = 3600_000 // 1 hour

async function getJwks() {
  if (cachedJwks && Date.now() - jwksFetchedAt < JWKS_TTL_MS) return cachedJwks
  const res = await fetch('https://rest.fal.ai/.well-known/jwks.json')
  if (!res.ok) throw new Error(`Failed to fetch fal.ai JWKS: ${res.status}`)
  cachedJwks = (await res.json()) as { keys: { kid: string; x: string }[] }
  jwksFetchedAt = Date.now()
  return cachedJwks
}

async function verifySignature(
  payload: string,
  signature: string,
  keyId: string,
): Promise<boolean> {
  try {
    const jwks = await getJwks()
    const jwk = jwks.keys.find((k) => k.kid === keyId)
    if (!jwk) return false

    // Import ED25519 public key from raw base64url x parameter
    const keyData = Uint8Array.from(
      atob(jwk.x.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    )
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'Ed25519' },
      false,
      ['verify'],
    )

    const sigBytes = Uint8Array.from(
      atob(signature.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    )
    const payloadBytes = new TextEncoder().encode(payload)

    return await crypto.subtle.verify('Ed25519', cryptoKey, sigBytes, payloadBytes)
  } catch (err) {
    console.error('[webhooks/fal] signature verification error:', err)
    return false
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-fal-signature') ?? ''
    const keyId = req.headers.get('x-fal-key-id') ?? ''

    // Verify webhook signature — REQUIRED
    if (!signature || !keyId) {
      console.error('[webhooks/fal] missing signature headers')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }
    const valid = await verifySignature(body, signature, keyId)
    if (!valid) {
      console.error('[webhooks/fal] invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(body) as {
      request_id: string
      status: 'OK' | 'ERROR'
      payload?: {
        images?: { url: string; width: number; height: number }[]
        image?: { url: string; width: number; height: number }
      }
      error?: string
    }

    const supabase = getSupabaseAdmin()

    if (payload.status === 'OK' && payload.payload) {
      const resultImage =
        payload.payload.images?.[0] ?? payload.payload.image

      await supabase
        .from('ai_jobs')
        .update({
          status: 'completed',
          result_url: resultImage?.url ?? null,
          result_width: resultImage?.width ?? null,
          result_height: resultImage?.height ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq('request_id', payload.request_id)
    } else {
      await supabase
        .from('ai_jobs')
        .update({
          status: 'failed',
          error_message: payload.error ?? 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('request_id', payload.request_id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhooks/fal] erro:', err)
    return NextResponse.json({ ok: true }) // Return 200 to avoid retries
  }
}
