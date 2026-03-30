import type { SocialProvider } from './types'
import { xProvider } from './providers/x'
import { instagramProvider } from './providers/instagram'
import { facebookProvider } from './providers/facebook'
import { youtubeProvider } from './providers/youtube'
import { tiktokProvider } from './providers/tiktok'
import { linkedinProvider } from './providers/linkedin'

export const providers: Record<string, SocialProvider> = {
  x: xProvider,
  instagram: instagramProvider,
  facebook: facebookProvider,
  youtube: youtubeProvider,
  tiktok: tiktokProvider,
  linkedin: linkedinProvider,
}

export function getProvider(identifier: string): SocialProvider {
  const provider = providers[identifier]
  if (!provider) throw new Error(`Provider '${identifier}' not found`)
  return provider
}

export { type SocialProvider, type AuthTokenDetails, type PostDetails, type PostResult } from './types'
