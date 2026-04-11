import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { SUPER_ADMIN_EMAIL } from '@/lib/shorts-config'
import type { ShortRecord } from '@/types/shorts'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const supabaseAuth = await createSupabaseServer()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createSupabaseAdmin()
    const { data: short, error } = await supabase
      .from('shorts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !short) {
      return NextResponse.json({ error: 'Short nao encontrado' }, { status: 404 })
    }

    const isAdmin = user.email === SUPER_ADMIN_EMAIL
    if (!isAdmin) {
      const { cost_usd, cost_breakdown, ...rest } = short as ShortRecord
      void cost_usd
      void cost_breakdown
      return NextResponse.json(rest)
    }

    return NextResponse.json(short)
  } catch (err) {
    console.error('[shorts/[id]] GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()

    const supabaseAuth = await createSupabaseServer()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createSupabaseAdmin()

    // Only allow updating scenes and narration_url
    const updateData: Record<string, unknown> = {}
    if (body.scenes) updateData.scenes = body.scenes
    if (body.narration_url) updateData.narration_url = body.narration_url

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })
    }

    const { error } = await supabase
      .from('shorts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[shorts/[id]] PATCH error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const supabaseAuth = await createSupabaseServer()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const supabase = createSupabaseAdmin()

    // Verify ownership
    const { data: short, error: fetchError } = await supabase
      .from('shorts')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !short) {
      return NextResponse.json({ error: 'Short nao encontrado' }, { status: 404 })
    }

    // Delete storage files: shorts/{user_id}/{id}/
    const storagePaths = [
      `${user.id}/${id}/audio.mp3`,
      `${user.id}/${id}/video.mp4`,
      `${user.id}/${id}/thumbnail.jpg`,
    ]
    await supabase.storage.from('shorts').remove(storagePaths)

    // Delete DB record
    const { error: deleteError } = await supabase
      .from('shorts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: 'Erro ao deletar short' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[shorts/[id]] DELETE error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
