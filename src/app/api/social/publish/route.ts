import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { getProvider } from '@/lib/social'

interface PublishRequestBody {
  integrationIds: string[]
  content: string
  media?: { url: string; type: 'image' | 'video' }[]
  scheduledAt?: string
  projectId?: string
}

interface IntegrationRow {
  id: string
  provider: string
  provider_account_id: string
  access_token: string
  refresh_token?: string
  token_expires_at?: string
  refresh_needed: boolean
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { integrationIds, content, media, scheduledAt, projectId } = await req.json() as PublishRequestBody

  const results = []

  for (const integrationId of integrationIds) {
    const { data: integration } = await supabase
      .from('social_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .single()

    if (!integration) {
      results.push({ integrationId, error: 'Integracao nao encontrada' })
      continue
    }

    const row = integration as IntegrationRow

    if (scheduledAt) {
      const { data: post } = await supabase.from('social_posts').insert({
        user_id: user.id,
        project_id: projectId,
        integration_id: integrationId,
        content,
        media_urls: media?.map((m) => m.url) || [],
        status: 'queued',
        scheduled_at: scheduledAt,
        settings: {},
      }).select().single()

      results.push({ integrationId, postId: (post as { id?: string } | null)?.id, status: 'scheduled' })
      continue
    }

    try {
      const provider = getProvider(row.provider)
      let accessToken = row.access_token

      if (row.token_expires_at && new Date(row.token_expires_at) < new Date()) {
        if (row.refresh_token) {
          const refreshed = await provider.refreshToken(row.refresh_token)
          accessToken = refreshed.accessToken
          await supabase.from('social_integrations').update({
            access_token: refreshed.accessToken,
            refresh_token: refreshed.refreshToken || row.refresh_token,
            token_expires_at: refreshed.expiresIn
              ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
              : null,
            refresh_needed: false,
          }).eq('id', integrationId)
        } else {
          await supabase.from('social_integrations').update({ refresh_needed: true }).eq('id', integrationId)
          results.push({ integrationId, error: 'Token expirado, reconecte a conta' })
          continue
        }
      }

      const postResults = await provider.post(
        row.provider_account_id,
        accessToken,
        [{ content, media }]
      )

      for (const pr of postResults) {
        await supabase.from('social_posts').insert({
          user_id: user.id,
          project_id: projectId,
          integration_id: integrationId,
          content,
          media_urls: media?.map((m) => m.url) || [],
          status: pr.status === 'published' ? 'published' : 'failed',
          published_at: new Date().toISOString(),
          published_url: pr.url,
          provider_post_id: pr.postId,
          error_message: pr.error,
        })
      }

      results.push({ integrationId, ...postResults[0] })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao publicar'
      await supabase.from('social_posts').insert({
        user_id: user.id,
        project_id: projectId,
        integration_id: integrationId,
        content,
        media_urls: media?.map((m) => m.url) || [],
        status: 'failed',
        error_message: msg,
      })
      results.push({ integrationId, error: msg, status: 'error' })
    }
  }

  return NextResponse.json({ results })
}
