import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { getProvider } from '@/lib/social'
import { google } from 'googleapis'

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerName } = await params
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthToken = url.searchParams.get('oauth_token') // X OAuth 1.0a

  // YouTube channel selection (step 2)
  const selectChannel = url.searchParams.get('select_channel')
  if (selectChannel && providerName === 'youtube') {
    return handleYouTubeChannelSelect(url)
  }

  if (!code && !oauthToken) {
    return new Response('<script>window.close()</script>', { headers: { 'Content-Type': 'text/html' } })
  }

  const admin = createSupabaseAdmin()

  const stateKey = state || oauthToken
  const { data: oauthState, error: stateError } = await admin
    .from('oauth_states')
    .select('*')
    .eq('state', stateKey)
    .single()

  if (!oauthState || stateError) {
    console.error('OAuth state lookup failed:', stateError)
    return errorPage('Estado OAuth invalido. O link expirou ou ja foi usado. Tente conectar novamente.')
  }

  try {
    const provider = getProvider(providerName)
    const authCode = code || url.searchParams.get('oauth_verifier') || ''

    // For YouTube: show channel selector before saving
    if (providerName === 'youtube') {
      return handleYouTubeAuth(authCode, oauthState)
    }

    const tokens = await provider.authenticate({
      code: authCode,
      codeVerifier: oauthState.code_verifier || undefined,
      redirectUrl: oauthState.redirect_url,
    })

    // Upsert integration
    const { error: upsertError } = await admin.from('social_integrations').upsert({
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

    if (upsertError) console.error('Upsert integration error:', upsertError)

    // Cleanup state
    await admin.from('oauth_states').delete().eq('state', stateKey)

    return successPage(tokens.name)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('OAuth callback error:', msg)
    return errorPage(msg)
  }
}

// ── YouTube: exchange code, list channels, show selector ──────────────────

async function handleYouTubeAuth(code: string, oauthState: { user_id: string; redirect_url: string; state: string; code_verifier: string | null }) {
  const client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    oauthState.redirect_url,
  )

  const { tokens } = await client.getToken(code)
  client.setCredentials(tokens)

  const youtube = google.youtube({ version: 'v3', auth: client })
  const { data } = await youtube.channels.list({ part: ['snippet', 'statistics'], mine: true })
  const channels = data.items || []

  if (channels.length === 0) {
    return errorPage('Nenhum canal do YouTube encontrado nesta conta.')
  }

  // If only 1 channel, save directly
  if (channels.length === 1) {
    const ch = channels[0]
    const admin = createSupabaseAdmin()

    await admin.from('social_integrations').upsert({
      user_id: oauthState.user_id,
      provider: 'youtube',
      provider_account_id: ch.id!,
      account_name: ch.snippet?.title || '',
      account_picture: ch.snippet?.thumbnails?.default?.url || '',
      account_handle: ch.snippet?.customUrl || '',
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      scopes: ['youtube.upload', 'youtube.force-ssl', 'userinfo.profile'],
      connected_at: new Date().toISOString(),
      disabled: false,
      refresh_needed: false,
    }, { onConflict: 'user_id,provider,provider_account_id' })

    await admin.from('oauth_states').delete().eq('state', oauthState.state)
    return successPage(ch.snippet?.title || 'YouTube')
  }

  // Multiple channels: save tokens temporarily and show selector
  const admin = createSupabaseAdmin()
  const tempKey = crypto.randomUUID()

  await admin.from('oauth_states').upsert({
    state: tempKey,
    user_id: oauthState.user_id,
    provider: 'youtube',
    code_verifier: JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    }),
    redirect_url: oauthState.redirect_url,
  })

  // Cleanup original state
  await admin.from('oauth_states').delete().eq('state', oauthState.state)

  // Build channel selector HTML
  const channelCards = channels.map((ch) => `
    <button onclick="selectChannel('${ch.id}', '${tempKey}')" class="card">
      <img src="${ch.snippet?.thumbnails?.default?.url || ''}" alt="" class="avatar" />
      <div>
        <p class="name">${ch.snippet?.title || 'Canal'}</p>
        <p class="handle">${ch.snippet?.customUrl || ''}</p>
        <p class="stats">${Number(ch.statistics?.subscriberCount || 0).toLocaleString('pt-BR')} inscritos · ${ch.statistics?.videoCount || 0} videos</p>
      </div>
    </button>
  `).join('')

  return new Response(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Selecionar Canal</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #09090b; color: #fafafa; font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
      .container { width: 100%; max-width: 480px; }
      h2 { font-size: 20px; margin-bottom: 4px; text-align: center; }
      .subtitle { color: #71717a; font-size: 14px; margin-bottom: 24px; text-align: center; }
      .card { display: flex; align-items: center; gap: 12px; width: 100%; padding: 16px; background: #18181b; border: 1px solid #27272a; border-radius: 12px; cursor: pointer; text-align: left; color: #fafafa; margin-bottom: 8px; transition: all 0.2s; }
      .card:hover { border-color: #22c55e; background: #1a2e1a; }
      .avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
      .name { font-weight: 600; font-size: 15px; }
      .handle { color: #71717a; font-size: 13px; margin-top: 2px; }
      .stats { color: #52525b; font-size: 12px; margin-top: 4px; }
      .loading { display: none; text-align: center; color: #71717a; padding: 20px; }
      .loading.active { display: block; }
    </style>
    </head>
    <body>
      <div class="container">
        <h2>Selecionar Canal</h2>
        <p class="subtitle">Escolha qual canal do YouTube conectar</p>
        <div id="channels">${channelCards}</div>
        <div id="loading" class="loading">Conectando...</div>
      </div>
      <script>
        async function selectChannel(channelId, tempKey) {
          document.getElementById('channels').style.display = 'none';
          document.getElementById('loading').className = 'loading active';

          const res = await fetch(window.location.pathname + '?select_channel=' + channelId + '&temp_key=' + tempKey);
          const html = await res.text();
          document.body.innerHTML = html;

          setTimeout(() => window.close(), 1500);
        }
      </script>
    </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } })
}

// ── YouTube: save selected channel ────────────────────────────────────────

async function handleYouTubeChannelSelect(url: URL) {
  const channelId = url.searchParams.get('select_channel')!
  const tempKey = url.searchParams.get('temp_key')!

  const admin = createSupabaseAdmin()

  const { data: tempState } = await admin
    .from('oauth_states')
    .select('*')
    .eq('state', tempKey)
    .single()

  if (!tempState) {
    return new Response(errorBody('Sessao expirada. Tente conectar novamente.'), { headers: { 'Content-Type': 'text/html' } })
  }

  const tokens = JSON.parse(tempState.code_verifier || '{}')

  // Get channel info
  const client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
  )
  client.setCredentials({ access_token: tokens.access_token })

  const youtube = google.youtube({ version: 'v3', auth: client })
  const { data } = await youtube.channels.list({ part: ['snippet'], id: [channelId] })
  const channel = data.items?.[0]

  if (!channel) {
    return new Response(errorBody('Canal nao encontrado.'), { headers: { 'Content-Type': 'text/html' } })
  }

  // Save integration
  await admin.from('social_integrations').upsert({
    user_id: tempState.user_id,
    provider: 'youtube',
    provider_account_id: channel.id!,
    account_name: channel.snippet?.title || '',
    account_picture: channel.snippet?.thumbnails?.default?.url || '',
    account_handle: channel.snippet?.customUrl || '',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || null,
    token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    scopes: ['youtube.upload', 'youtube.force-ssl', 'userinfo.profile'],
    connected_at: new Date().toISOString(),
    disabled: false,
    refresh_needed: false,
  }, { onConflict: 'user_id,provider,provider_account_id' })

  // Cleanup
  await admin.from('oauth_states').delete().eq('state', tempKey)

  return new Response(successBody(channel.snippet?.title || 'YouTube'), { headers: { 'Content-Type': 'text/html' } })
}

// ── HTML helpers ──────────────────────────────────────────────────────────

function successPage(name: string) {
  return new Response(successBody(name), { headers: { 'Content-Type': 'text/html' } })
}

function successBody(name: string) {
  return `<div style="text-align:center"><h2>&#10003; ${name} conectado!</h2><p>Esta janela vai fechar automaticamente...</p></div><script>setTimeout(()=>window.close(),1500)</script>`
}

function errorPage(message: string) {
  return new Response(errorBody(message), { headers: { 'Content-Type': 'text/html' } })
}

function errorBody(message: string) {
  return `<body style="background:#09090b;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h2>&#10007; Erro ao conectar</h2><p>${message}</p><button onclick="window.close()" style="margin-top:16px;padding:8px 24px;background:#22c55e;border:none;border-radius:8px;color:#fff;cursor:pointer">Fechar</button></div></body>`
}
