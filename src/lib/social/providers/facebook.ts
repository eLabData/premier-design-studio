import type { SocialProvider, AuthTokenDetails, PostDetails, PostResult } from '../types'

const GRAPH_URL = 'https://graph.facebook.com/v20.0'

export const facebookProvider: SocialProvider = {
  identifier: 'facebook',
  name: 'Facebook',
  scopes: ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement'],

  async generateAuthUrl(redirectUrl: string) {
    const state = crypto.randomUUID()
    const scopes = this.scopes.join(',')
    const url = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=${scopes}&state=${state}&response_type=code`
    return { url, state }
  },

  async authenticate({ code, redirectUrl }) {
    const tokenRes = await fetch(`${GRAPH_URL}/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUrl)}&code=${code}`)
    const { access_token } = await tokenRes.json() as { access_token: string }

    const longRes = await fetch(`${GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${access_token}`)
    const { access_token: longToken, expires_in } = await longRes.json() as { access_token: string; expires_in: number }

    const pagesRes = await fetch(`${GRAPH_URL}/me/accounts?access_token=${longToken}`)
    const { data: pages } = await pagesRes.json() as { data: Array<{ id: string; access_token: string; name: string }> }
    if (!pages?.length) throw new Error('Nenhuma pagina encontrada')

    const page = pages[0]
    return {
      id: page.id,
      accessToken: page.access_token,
      name: page.name,
      picture: `https://graph.facebook.com/${page.id}/picture?type=small`,
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

    if (firstPost.media?.length && firstPost.media[0].type === 'video') {
      const videoRes = await fetch(`${GRAPH_URL}/${accountId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: firstPost.media[0].url, description: firstPost.content, access_token: accessToken }),
      })
      const { id: videoId } = await videoRes.json() as { id: string }
      results.push({ postId: videoId, url: `https://facebook.com/${videoId}`, status: 'published' })
    } else if (firstPost.media?.length) {
      const photoIds: string[] = []
      for (const m of firstPost.media) {
        const photoRes = await fetch(`${GRAPH_URL}/${accountId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: m.url, published: false, access_token: accessToken }),
        })
        const { id } = await photoRes.json() as { id: string }
        photoIds.push(id)
      }

      const body: Record<string, string> = { message: firstPost.content, access_token: accessToken }
      photoIds.forEach((id, i) => { body[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }) })

      const feedRes = await fetch(`${GRAPH_URL}/${accountId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const { id: postId } = await feedRes.json() as { id: string }
      results.push({ postId, url: `https://facebook.com/${postId}`, status: 'published' })
    } else {
      const feedRes = await fetch(`${GRAPH_URL}/${accountId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: firstPost.content, access_token: accessToken }),
      })
      const { id: postId } = await feedRes.json() as { id: string }
      results.push({ postId, url: `https://facebook.com/${postId}`, status: 'published' })
    }

    return results
  },
}
