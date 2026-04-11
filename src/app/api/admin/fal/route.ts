import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { SUPER_ADMIN_EMAIL } from '@/lib/shorts-config'

const FAL_API = 'https://api.fal.ai'

async function requireAdmin() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    return null
  }
  return user
}

async function falAdmin(path: string, method = 'GET', body?: unknown) {
  const key = process.env.FAL_AI_ADMIN_KEY
  if (!key) {
    throw new Error('FAL_AI_ADMIN_KEY nao configurada')
  }

  const res = await fetch(`${FAL_API}${path}`, {
    method,
    headers: {
      Authorization: `Key ${key}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    throw new Error(`fal.ai ${res.status}: ${errText}`)
  }

  return res.json()
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    switch (action) {
      case 'billing': {
        const data = await falAdmin('/v1/account/billing?expand=credits')
        return NextResponse.json(data)
      }

      case 'usage': {
        const start = searchParams.get('start') || new Date(Date.now() - 30 * 86400000).toISOString()
        const end = searchParams.get('end') || new Date().toISOString()
        const timeframe = searchParams.get('timeframe') || 'day'
        const url = `/v1/models/usage?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&timeframe=${timeframe}&expand=time_series&expand=summary`
        const data = await falAdmin(url)
        return NextResponse.json(data)
      }

      case 'usage-summary': {
        const start = searchParams.get('start') || new Date(Date.now() - 30 * 86400000).toISOString()
        const end = searchParams.get('end') || new Date().toISOString()
        const url = `/v1/models/usage?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&expand=summary`
        const data = await falAdmin(url)
        return NextResponse.json(data)
      }

      case 'keys': {
        const data = await falAdmin('/v1/keys')
        return NextResponse.json(data)
      }

      default:
        return NextResponse.json({ error: 'action invalida' }, { status: 400 })
    }
  } catch (err) {
    console.error('[admin/fal]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'create-key': {
        const body = await req.json()
        const data = await falAdmin('/v1/keys/create', 'POST', {
          alias: body.alias || 'api-key',
          scope: body.scope || 'API',
        })
        return NextResponse.json(data)
      }

      case 'delete-key': {
        const body = await req.json()
        if (!body.key_id) {
          return NextResponse.json({ error: 'key_id obrigatorio' }, { status: 400 })
        }
        const data = await falAdmin('/v1/keys/delete', 'DELETE', {
          key_id: body.key_id,
        })
        return NextResponse.json(data)
      }

      default:
        return NextResponse.json({ error: 'action invalida' }, { status: 400 })
    }
  } catch (err) {
    console.error('[admin/fal]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
