export interface AuthTokenDetails {
  id: string
  accessToken: string
  refreshToken?: string
  expiresIn?: number // seconds
  name: string
  picture?: string
  username?: string
}

export interface PostDetails {
  content: string
  media?: { url: string; type: 'image' | 'video' }[]
  settings?: Record<string, unknown>
}

export interface PostResult {
  postId: string
  url: string
  status: 'published' | 'error'
  error?: string
}

export interface SocialProvider {
  identifier: string
  name: string
  scopes: string[]
  generateAuthUrl(redirectUrl: string): Promise<{ url: string; state: string; codeVerifier?: string }>
  authenticate(params: { code: string; codeVerifier?: string; redirectUrl: string }): Promise<AuthTokenDetails>
  refreshToken(refreshToken: string): Promise<AuthTokenDetails>
  post(accountId: string, accessToken: string, posts: PostDetails[]): Promise<PostResult[]>
}
