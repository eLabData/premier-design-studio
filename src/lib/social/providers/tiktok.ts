import type { SocialProvider, AuthTokenDetails, PostDetails, PostResult } from '../types'

export const tiktokProvider: SocialProvider = {
  identifier: 'tiktok',
  name: 'TikTok',
  scopes: ['user.info.basic', 'video.publish', 'video.upload'],

  async generateAuthUrl(redirectUrl: string) {
    const state = crypto.randomUUID()
    const url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${process.env.TIKTOK_CLIENT_ID}&scope=${this.scopes.join(',')}&response_type=code&redirect_uri=${encodeURIComponent(redirectUrl)}&state=${state}`
    return { url, state }
  },

  async authenticate({ code, redirectUrl }) {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_ID!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUrl,
      }),
    })
    const tokens = await tokenRes.json() as {
      access_token: string
      refresh_token: string
      open_id: string
      expires_in: number
    }

    const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,username', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const { data: { user } } = await userRes.json() as {
      data: { user: { open_id: string; display_name: string; avatar_url: string; username: string } }
    }

    return {
      id: tokens.open_id || user.open_id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      name: user.display_name,
      picture: user.avatar_url,
      username: user.username,
      expiresIn: tokens.expires_in || 86400,
    }
  },

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_ID!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })
    const tokens = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
    return {
      id: '',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      name: '',
      expiresIn: tokens.expires_in,
    }
  },

  async post(accountId: string, accessToken: string, posts: PostDetails[]): Promise<PostResult[]> {
    const firstPost = posts[0]
    const results: PostResult[] = []

    if (firstPost.media?.length && firstPost.media[0].type === 'video') {
      const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_info: { title: firstPost.content.slice(0, 150), privacy_level: 'SELF_ONLY' },
          source_info: { source: 'PULL_FROM_URL', video_url: firstPost.media[0].url },
        }),
      })
      const { data } = await initRes.json() as { data?: { publish_id?: string } }
      results.push({
        postId: data?.publish_id || 'pending',
        url: `https://tiktok.com/@${accountId}`,
        status: 'published',
      })
    }

    return results
  },
}
