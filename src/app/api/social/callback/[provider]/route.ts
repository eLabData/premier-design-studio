import { createSupabaseServer } from '@/lib/supabase-server'
import { getProvider } from '@/lib/social'

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerName } = await params
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthToken = url.searchParams.get('oauth_token') // X OAuth 1.0a

  if (!code && !oauthToken) {
    return new Response('<script>window.close()</script>', { headers: { 'Content-Type': 'text/html' } })
  }

  const supabase = await createSupabaseServer()

  const stateKey = state || oauthToken
  const { data: oauthState } = await supabase
    .from('oauth_states')
    .select('*')
    .eq('state', stateKey)
    .single()

  if (!oauthState) {
    return new Response(
      '<script>alert("Estado OAuth invalido");window.close()</script>',
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  try {
    const provider = getProvider(providerName)
    const authCode = code || url.searchParams.get('oauth_verifier') || ''

    const tokens = await provider.authenticate({
      code: authCode,
      codeVerifier: oauthState.code_verifier || undefined,
      redirectUrl: oauthState.redirect_url,
    })

    await supabase.from('social_integrations').upsert({
      user_id: oauthState.user_id,
      provider: providerName,
      provider_account_id: tokens.id,
      account_name: tokens.name,
      account_picture: tokens.picture,
      account_handle: tokens.username,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_expires_at: tokens.expiresIn
        ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
        : null,
      scopes: provider.scopes,
      connected_at: new Date().toISOString(),
      disabled: false,
      refresh_needed: false,
    }, { onConflict: 'user_id,provider,provider_account_id' })

    await supabase.from('oauth_states').delete().eq('state', stateKey)

    return new Response(
      `<html><body style="background:#09090b;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh">
        <div style="text-align:center">
          <h2>&#10003; ${tokens.name} conectado!</h2>
          <p>Esta janela vai fechar automaticamente...</p>
        </div>
        <script>setTimeout(()=>window.close(),1500)</script>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      `<html><body style="background:#09090b;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh">
        <div style="text-align:center">
          <h2>&#10007; Erro ao conectar</h2>
          <p>${msg}</p>
          <button onclick="window.close()" style="margin-top:16px;padding:8px 24px;background:#22c55e;border:none;border-radius:8px;color:#fff;cursor:pointer">Fechar</button>
        </div>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
