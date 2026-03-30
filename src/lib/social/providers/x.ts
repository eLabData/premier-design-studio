import { TwitterApi } from 'twitter-api-v2'
import type { SocialProvider, AuthTokenDetails, PostDetails, PostResult } from '../types'

export const xProvider: SocialProvider = {
  identifier: 'x',
  name: 'X (Twitter)',
  scopes: ['tweet.read', 'tweet.write', 'users.read'],

  async generateAuthUrl(redirectUrl: string) {
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
    })
    const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink(
      redirectUrl,
      { authAccessType: 'write', linkMode: 'authenticate', forceLogin: false }
    )
    return {
      url,
      state: oauth_token,
      codeVerifier: `${oauth_token}:${oauth_token_secret}`,
    }
  },

  async authenticate({ code, codeVerifier }) {
    const [oauthToken, oauthSecret] = (codeVerifier || '').split(':')
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: oauthToken,
      accessSecret: oauthSecret,
    })
    const { accessToken, accessSecret, client: loggedClient } = await client.login(code)
    const { data: user } = await loggedClient.v2.me({ 'user.fields': ['profile_image_url', 'username', 'name'] })
    return {
      id: user.id,
      accessToken: `${accessToken}:${accessSecret}`,
      name: user.name,
      picture: user.profile_image_url,
      username: user.username,
      expiresIn: 999999999,
    }
  },

  async refreshToken(): Promise<AuthTokenDetails> {
    throw new Error('X OAuth 1.0a tokens do not expire')
  },

  async post(accountId: string, accessToken: string, posts: PostDetails[]): Promise<PostResult[]> {
    const [token, secret] = accessToken.split(':')
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: token,
      accessSecret: secret,
    })

    const results: PostResult[] = []
    const firstPost = posts[0]

    const mediaIds: string[] = []
    if (firstPost.media?.length) {
      for (const m of firstPost.media) {
        const response = await fetch(m.url)
        const buffer = Buffer.from(await response.arrayBuffer())
        const mediaId = await client.v1.uploadMedia(buffer, {
          mimeType: m.type === 'video' ? 'video/mp4' : 'image/jpeg',
        })
        mediaIds.push(mediaId)
      }
    }

    const { data } = await client.v2.tweet({
      text: firstPost.content,
      ...(mediaIds.length ? { media: { media_ids: mediaIds as [string] } } : {}),
    })

    const { data: me } = await client.v2.me()
    results.push({
      postId: data.id,
      url: `https://twitter.com/${me.username}/status/${data.id}`,
      status: 'published',
    })

    void accountId // used in URL construction via me.username

    return results
  },
}
