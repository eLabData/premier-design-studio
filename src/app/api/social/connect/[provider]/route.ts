import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { getProvider } from '@/lib/social'

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerName } = await params
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = getProvider(providerName)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUrl = `${appUrl}/api/social/callback/${providerName}`

  const { url, state, codeVerifier } = await provider.generateAuthUrl(redirectUrl)

  await supabase.from('oauth_states').insert({
    state,
    user_id: user.id,
    provider: providerName,
    code_verifier: codeVerifier || null,
    redirect_url: redirectUrl,
  })

  return NextResponse.json({ url })
}
