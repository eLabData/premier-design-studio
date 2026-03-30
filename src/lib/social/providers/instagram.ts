import type { SocialProvider, AuthTokenDetails, PostDetails, PostResult } from '../types'

const GRAPH_URL = 'https://graph.facebook.com/v20.0'

export const instagramProvider: SocialProvider = {
  identifier: 'instagram',
  name: 'Instagram',
  scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement'],

  async generateAuthUrl(redirectUrl: string) {
    const state = crypto.randomUUID()
    const scopes = this.scopes.join(',')
    const url = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=${scopes}&state=${state}&response_type=code`
    return { url, state }
  },

  async authenticate({ code, redirectUrl }) {
    const tokenRes = await fetch(`${GRAPH_URL}/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUrl)}&code=${code}`)
    const { access_token: shortToken } = await tokenRes.json() as { access_token: string }

    const longRes = await fetch(`${GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${shortToken}`)
    const { access_token: longToken, expires_in } = await longRes.json() as { access_token: string; expires_in: number }

    const pagesRes = await fetch(`${GRAPH_URL}/me/accounts?access_token=${longToken}`)
    const { data: pages } = await pagesRes.json() as { data: Array<{ id: string; access_token: string; name: string }> }

    if (!pages?.length) throw new Error('Nenhuma pagina do Facebook encontrada. Crie uma pagina primeiro.')

    const page = pages[0]
    const igRes = await fetch(`${GRAPH_URL}/${page.id}?fields=instagram_business_account,name,picture&access_token=${page.access_token}`)
    const pageData = await igRes.json() as { instagram_business_account?: { id: string } }

    if (!pageData.instagram_business_account) {
      throw new Error('Nenhuma conta profissional do Instagram vinculada a esta pagina.')
    }

    const igId = pageData.instagram_business_account.id
    const igInfoRes = await fetch(`${GRAPH_URL}/${igId}?fields=username,profile_picture_url,name&access_token=${page.access_token}`)
    const igInfo = await igInfoRes.json() as { username?: string; profile_picture_url?: string; name?: string }

    return {
      id: igId,
      accessToken: page.access_token,
      name: igInfo.name || igInfo.username || '',
      picture: igInfo.profile_picture_url,
      username: igInfo.username,
      expiresIn: expires_in || 5184000,
    }
  },

  async refreshToken(token: string): Promise<AuthTokenDetails> {
    const res = await fetch(`${GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${token}`)
    const { access_token, expires_in } = await res.json() as { access_token: string; expires_in: number }
    return { id: '', accessToken: access_token, name: '', expiresIn: expires_in }
  },

  async post(accountId: string, accessToken: string, posts: PostDetails[]): Promise<PostResult[]> {
    const firstPost = posts[0]
    const results: PostResult[] = []

    if (firstPost.media?.length) {
      const mediaIds: string[] = []

      for (const m of firstPost.media) {
        const isVideo = m.type === 'video'
        const params = new URLSearchParams({
          access_token: accessToken,
          ...(isVideo ? { video_url: m.url, media_type: 'REELS' } : { image_url: m.url }),
          ...(firstPost.content && mediaIds.length === 0 ? { caption: firstPost.content } : {}),
          ...(firstPost.media!.length > 1 ? { is_carousel_item: 'true' } : {}),
        })

        const createRes = await fetch(`${GRAPH_URL}/${accountId}/media?${params}`, { method: 'POST' })
        const { id: mediaId } = await createRes.json() as { id: string }

        if (isVideo) {
          let status = 'IN_PROGRESS'
          while (status === 'IN_PROGRESS') {
            await new Promise(r => setTimeout(r, 5000))
            const statusRes = await fetch(`${GRAPH_URL}/${mediaId}?fields=status_code&access_token=${accessToken}`)
            const statusData = await statusRes.json() as { status_code?: string }
            status = statusData.status_code || 'FINISHED'
          }
        }

        mediaIds.push(mediaId)
      }

      let publishId: string
      if (mediaIds.length > 1) {
        const carouselParams = new URLSearchParams({
          access_token: accessToken,
          caption: firstPost.content,
          media_type: 'CAROUSEL',
          children: mediaIds.join(','),
        })
        const carRes = await fetch(`${GRAPH_URL}/${accountId}/media?${carouselParams}`, { method: 'POST' })
        const { id: carouselId } = await carRes.json() as { id: string }
        const pubRes = await fetch(`${GRAPH_URL}/${accountId}/media_publish?creation_id=${carouselId}&access_token=${accessToken}`, { method: 'POST' })
        publishId = (await pubRes.json() as { id: string }).id
      } else {
        const pubRes = await fetch(`${GRAPH_URL}/${accountId}/media_publish?creation_id=${mediaIds[0]}&access_token=${accessToken}`, { method: 'POST' })
        publishId = (await pubRes.json() as { id: string }).id
      }

      const linkRes = await fetch(`${GRAPH_URL}/${publishId}?fields=permalink&access_token=${accessToken}`)
      const { permalink } = await linkRes.json() as { permalink?: string }

      results.push({ postId: publishId, url: permalink || '', status: 'published' })
    }

    return results
  },
}
