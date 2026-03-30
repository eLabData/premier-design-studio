/**
 * Postiz API Client
 * Docs: https://docs.postiz.com/public-api
 * Self-hosted at: https://social.elabdata.com.br
 */

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://social.elabdata.com.br'
const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY || ''

interface PostizPost {
  type: 'now' | 'schedule' | 'draft'
  date?: string // ISO 8601 for scheduled posts
  posts: PostizPostItem[]
}

interface PostizPostItem {
  content: string
  integration: string // integration ID from Postiz
  media?: PostizMedia[]
}

interface PostizMedia {
  url: string
  type: 'image' | 'video'
}

interface PostizIntegration {
  id: string
  name: string
  picture: string
  provider: string // 'facebook', 'instagram', 'youtube', 'tiktok', 'x', etc
  disabled: boolean
}

async function postizFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${POSTIZ_URL}/api/public/v1${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': POSTIZ_API_KEY,
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Postiz API error (${res.status}): ${error}`)
  }

  return res.json()
}

/**
 * List all connected social media integrations
 */
export async function getIntegrations(): Promise<PostizIntegration[]> {
  return postizFetch<PostizIntegration[]>('/integrations')
}

/**
 * Publish a post immediately to selected integrations
 */
export async function publishNow(content: string, integrationIds: string[], media?: PostizMedia[]): Promise<unknown> {
  return postizFetch('/posts', {
    method: 'POST',
    body: JSON.stringify({
      type: 'now',
      posts: integrationIds.map((id) => ({
        content,
        integration: id,
        media,
      })),
    } satisfies PostizPost),
  })
}

/**
 * Schedule a post for a future date
 */
export async function schedulePost(
  content: string,
  integrationIds: string[],
  scheduledDate: Date,
  media?: PostizMedia[]
): Promise<unknown> {
  return postizFetch('/posts', {
    method: 'POST',
    body: JSON.stringify({
      type: 'schedule',
      date: scheduledDate.toISOString(),
      posts: integrationIds.map((id) => ({
        content,
        integration: id,
        media,
      })),
    } satisfies PostizPost),
  })
}

/**
 * Save a draft post
 */
export async function saveDraft(content: string, integrationIds: string[], media?: PostizMedia[]): Promise<unknown> {
  return postizFetch('/posts', {
    method: 'POST',
    body: JSON.stringify({
      type: 'draft',
      posts: integrationIds.map((id) => ({
        content,
        integration: id,
        media,
      })),
    } satisfies PostizPost),
  })
}

/**
 * Map platform names to Postiz provider names
 */
export const PLATFORM_TO_PROVIDER: Record<string, string> = {
  instagram: 'instagram',
  facebook: 'facebook',
  youtube: 'youtube',
  tiktok: 'tiktok',
  x: 'x',
  linkedin: 'linkedin',
  threads: 'threads',
  pinterest: 'pinterest',
}
