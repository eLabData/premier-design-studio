import { google } from 'googleapis'
import type { SocialProvider, AuthTokenDetails, PostDetails, PostResult } from '../types'

const oauth2Client = (redirectUri?: string) => new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  redirectUri,
)

export const youtubeProvider: SocialProvider = {
  identifier: 'youtube',
  name: 'YouTube',
  scopes: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],

  async generateAuthUrl(redirectUrl: string) {
    const client = oauth2Client(redirectUrl)
    const state = crypto.randomUUID()
    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      state,
      prompt: 'consent',
    })
    return { url, state }
  },

  async authenticate({ code, redirectUrl }) {
    const client = oauth2Client(redirectUrl)
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const { data: userInfo } = await oauth2.userinfo.get()

    const youtube = google.youtube({ version: 'v3', auth: client })
    const { data: channels } = await youtube.channels.list({ part: ['snippet'], mine: true })
    const channel = channels.items?.[0]

    return {
      id: channel?.id || userInfo.id || '',
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token || undefined,
      name: channel?.snippet?.title || userInfo.name || '',
      picture: channel?.snippet?.thumbnails?.default?.url || userInfo.picture || '',
      username: channel?.snippet?.customUrl || undefined,
      expiresIn: 3600,
    }
  },

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const client = oauth2Client()
    client.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await client.refreshAccessToken()
    return {
      id: '',
      accessToken: credentials.access_token!,
      refreshToken: credentials.refresh_token || refreshToken,
      name: '',
      expiresIn: 3600,
    }
  },

  async post(accountId: string, accessToken: string, posts: PostDetails[]): Promise<PostResult[]> {
    const client = oauth2Client()
    client.setCredentials({ access_token: accessToken })
    const youtube = google.youtube({ version: 'v3', auth: client })
    const firstPost = posts[0]
    const results: PostResult[] = []

    if (firstPost.media?.length && firstPost.media[0].type === 'video') {
      const videoUrl = firstPost.media[0].url
      const videoRes = await fetch(videoUrl)
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
      const { Readable } = await import('stream')
      const stream = Readable.from(videoBuffer)

      const { data } = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: firstPost.content.slice(0, 100),
            description: firstPost.content,
            categoryId: '22',
          },
          status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
        },
        media: { body: stream },
      })

      results.push({
        postId: data.id!,
        url: `https://youtube.com/watch?v=${data.id}`,
        status: 'published',
      })
    }

    void accountId
    return results
  },
}
