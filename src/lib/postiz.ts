/**
 * Postiz API Client
 * Docs: https://docs.postiz.com/public-api
 * Self-hosted at: https://social.elabdata.com.br
 */

const POSTIZ_URL = process.env.NEXT_PUBLIC_POSTIZ_URL || 'https://social.elabdata.com.br'

export const POSTIZ_API_KEY_STORAGE = 'pds_postiz_api_key'

async function postizFetch<T>(endpoint: string, apiKey: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${POSTIZ_URL}/api/public/v1${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Postiz API error (${res.status}): ${error}`)
  }

  return res.json()
}

// === Integrations ============================================================

export interface PostizIntegration {
  id: string
  name: string
  picture?: string
  providerIdentifier: string // 'instagram' | 'facebook' | 'x' | 'youtube' | 'tiktok' | 'linkedin' | 'threads' | ...
  disabled: boolean
  internalId: string
  profile?: string
}

export async function getIntegrations(apiKey: string): Promise<PostizIntegration[]> {
  return postizFetch<PostizIntegration[]>('/integrations', apiKey)
}

export async function getOAuthUrl(apiKey: string, provider: string): Promise<{ url: string }> {
  return postizFetch<{ url: string }>(`/integrations/oauth/${provider}`, apiKey)
}

// === Posts ===================================================================

export interface PostizPost {
  id: string
  content: string
  state: 'QUEUE' | 'PUBLISHED' | 'ERROR' | 'DRAFT'
  publishDate: string
  releaseURL?: string
  error?: string
  integration: PostizIntegration
}

export interface CreatePostParams {
  integrationId: string
  content: string
  publishDate?: string // ISO 8601 — omit for immediate publish
  type?: 'default' | 'draft'
  image?: { path: string }[]
  settings?: Record<string, unknown>
}

interface PostizCreatePayload {
  type: 'now' | 'schedule' | 'draft'
  date?: string
  posts: {
    content: string
    integration: string
    image?: { path: string }[]
    settings?: Record<string, unknown>
  }[]
}

export async function getPosts(apiKey: string): Promise<PostizPost[]> {
  return postizFetch<PostizPost[]>('/posts', apiKey)
}

export async function createPost(apiKey: string, params: CreatePostParams): Promise<PostizPost> {
  const postType: 'now' | 'schedule' | 'draft' = params.type === 'draft'
    ? 'draft'
    : params.publishDate
    ? 'schedule'
    : 'now'

  const payload: PostizCreatePayload = {
    type: postType,
    ...(params.publishDate ? { date: params.publishDate } : {}),
    posts: [
      {
        content: params.content,
        integration: params.integrationId,
        ...(params.image ? { image: params.image } : {}),
        ...(params.settings ? { settings: params.settings } : {}),
      },
    ],
  }

  return postizFetch<PostizPost>('/posts', apiKey, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deletePost(apiKey: string, postId: string): Promise<void> {
  await postizFetch<unknown>(`/posts/${postId}`, apiKey, { method: 'DELETE' })
}

// === Media ===================================================================

export async function uploadMedia(apiKey: string, file: File): Promise<{ path: string }> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${POSTIZ_URL}/api/public/v1/media`, {
    method: 'POST',
    headers: { Authorization: apiKey },
    body: form,
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Postiz media upload error (${res.status}): ${error}`)
  }

  return res.json()
}

export async function uploadMediaFromUrl(apiKey: string, url: string): Promise<{ path: string }> {
  return postizFetch<{ path: string }>('/media/url', apiKey, {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

// === Provider display info ===================================================

export const PROVIDERS: Record<string, { name: string; color: string; icon: string }> = {
  instagram:  { name: 'Instagram', color: 'text-pink-500',   icon: 'Camera'        },
  facebook:   { name: 'Facebook',  color: 'text-blue-500',   icon: 'Globe'         },
  youtube:    { name: 'YouTube',   color: 'text-red-500',    icon: 'Tv'            },
  tiktok:     { name: 'TikTok',   color: 'text-cyan-400',   icon: 'Music'         },
  x:          { name: 'X',        color: 'text-white',      icon: 'AtSign'        },
  linkedin:   { name: 'LinkedIn', color: 'text-blue-400',   icon: 'Briefcase'     },
  threads:    { name: 'Threads',  color: 'text-zinc-300',   icon: 'MessageCircle' },
  pinterest:  { name: 'Pinterest',color: 'text-red-400',    icon: 'Pin'           },
  bluesky:    { name: 'Bluesky',  color: 'text-sky-400',    icon: 'Cloud'         },
}
