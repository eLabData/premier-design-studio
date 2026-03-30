import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: integrations } = await supabase
    .from('social_integrations')
    .select('id, provider, provider_account_id, account_name, account_picture, account_handle, connected_at, disabled, refresh_needed')
    .eq('user_id', user.id)
    .eq('disabled', false)
    .order('connected_at', { ascending: false })

  return NextResponse.json(integrations || [])
}

export async function DELETE(req: Request) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { integrationId } = await req.json() as { integrationId: string }
  await supabase.from('social_integrations').delete().eq('id', integrationId).eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
