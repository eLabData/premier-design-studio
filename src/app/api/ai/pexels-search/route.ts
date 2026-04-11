import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { query, orientation = 'portrait', per_page = 6 } = await req.json()
    if (!query) {
      return NextResponse.json({ error: 'query required' }, { status: 400 })
    }

    const pexelsKey = process.env.PEXELS_API_KEY
    if (!pexelsKey) {
      return NextResponse.json({ error: 'PEXELS_API_KEY not configured' }, { status: 500 })
    }

    const url = new URL('https://api.pexels.com/v1/search')
    url.searchParams.set('query', query)
    url.searchParams.set('orientation', orientation)
    url.searchParams.set('per_page', String(per_page))
    url.searchParams.set('size', 'medium')

    const res = await fetch(url.toString(), {
      headers: { Authorization: pexelsKey },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Pexels error ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    const photos = (data.photos ?? []).map((p: { id: number; src: { portrait: string; medium: string; large: string }; alt: string; photographer: string }) => ({
      id: p.id,
      url: p.src.portrait || p.src.medium,
      urlLarge: p.src.large,
      alt: p.alt,
      photographer: p.photographer,
    }))

    return NextResponse.json({ photos })
  } catch (err) {
    console.error('[pexels-search]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
