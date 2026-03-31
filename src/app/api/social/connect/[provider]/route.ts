import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { getProvider } from '@/lib/social'

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerName } = await params
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const provider = getProvider(providerName)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUrl = `${appUrl}/api/social/callback/${providerName}`

    const { url, state, codeVerifier } = await provider.generateAuthUrl(redirectUrl)

    // Use admin client to bypass RLS on oauth_states
    const admin = createSupabaseAdmin()
    const { error } = await admin.from('oauth_states').insert({
      state,
      user_id: user.id,
      provider: providerName,
      code_verifier: codeVerifier || null,
      redirect_url: redirectUrl,
    })

    if (error) {
      console.error('Failed to save OAuth state:', error)
      return NextResponse.json({ error: 'Erro ao iniciar conexao' }, { status: 500 })
    }

    return NextResponse.json({ url })
  } catch (err) {
    console.error('OAuth connect error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao conectar' },
      { status: 500 }
    )
  }
}
