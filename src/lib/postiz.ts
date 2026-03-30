// Internal Social Media API Client
// Calls our own Next.js API routes (which use ported Postiz provider code)

export interface SocialIntegration {
  id: string
  provider: string
  provider_account_id: string
  account_name: string
  account_picture?: string
  account_handle?: string
  connected_at: string
  disabled: boolean
  refresh_needed: boolean
}

export async function getIntegrations(): Promise<SocialIntegration[]> {
  const res = await fetch('/api/social/integrations')
  if (!res.ok) throw new Error('Falha ao carregar integracoes')
  return res.json()
}

export async function connectProvider(provider: string): Promise<string> {
  const res = await fetch(`/api/social/connect/${provider}`)
  if (!res.ok) throw new Error('Falha ao iniciar OAuth')
  const { url } = await res.json() as { url: string }
  return url
}

export async function disconnectIntegration(integrationId: string): Promise<void> {
  await fetch('/api/social/integrations', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ integrationId }),
  })
}

export async function publishPost(params: {
  integrationIds: string[]
  content: string
  media?: { url: string; type: 'image' | 'video' }[]
  scheduledAt?: string
  projectId?: string
}): Promise<{
  results: Array<{
    integrationId: string
    postId?: string
    url?: string
    status: string
    error?: string
  }>
}> {
  const res = await fetch('/api/social/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error('Falha ao publicar')
  return res.json()
}

// Provider display info
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
