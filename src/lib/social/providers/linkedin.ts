import type { SocialProvider, AuthTokenDetails, PostDetails, PostResult } from '../types'

export const linkedinProvider: SocialProvider = {
  identifier: 'linkedin',
  name: 'LinkedIn',
  scopes: ['openid', 'profile', 'w_member_social'],

  async generateAuthUrl(redirectUrl: string) {
    const state = crypto.randomUUID()
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUrl)}&state=${state}&scope=${this.scopes.join('%20')}`
    return { url, state }
  },

  async authenticate({ code, redirectUrl }) {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUrl,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    })
    const { access_token, expires_in, refresh_token } = await tokenRes.json() as {
      access_token: string
      expires_in: number
      refresh_token?: string
    }

    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const profile = await profileRes.json() as { sub: string; name: string; picture?: string }

    return {
      id: profile.sub,
      accessToken: access_token,
      refreshToken: refresh_token,
      name: profile.name,
      picture: profile.picture,
      expiresIn: expires_in,
    }
  },

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    })
    const { access_token, expires_in, refresh_token: newRefresh } = await res.json() as {
      access_token: string
      expires_in: number
      refresh_token?: string
    }
    return { id: '', accessToken: access_token, refreshToken: newRefresh, name: '', expiresIn: expires_in }
  },

  async post(accountId: string, accessToken: string, posts: PostDetails[]): Promise<PostResult[]> {
    const firstPost = posts[0]
    const results: PostResult[] = []

    const body: Record<string, unknown> = {
      author: `urn:li:person:${accountId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: firstPost.content },
          shareMediaCategory: firstPost.media?.length ? 'IMAGE' : 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json() as { id?: string }

    results.push({
      postId: data.id || '',
      url: `https://linkedin.com/feed/update/${data.id}`,
      status: 'published',
    })

    return results
  },
}
