import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  plan: 'free' | 'pro' | 'business'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

interface AuthStore {
  user: User | null
  profile: Profile | null
  loading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  isPro: () => boolean
  isBusiness: () => boolean
  canAccess: (module: string) => boolean
}

// Module access by plan
const MODULE_ACCESS: Record<string, string[]> = {
  editor: ['free', 'pro', 'business'],
  designer: ['free', 'pro', 'business'],
  studio: ['pro', 'business'],
  scheduler: ['pro', 'business'],
  analytics: ['pro', 'business'],
  'ai-auto-edit': ['pro', 'business'],
  'ai-captions': ['free', 'pro', 'business'],
  broll: ['pro', 'business'],
  'export-4k': ['business'],
  'api-access': ['business'],
  team: ['business'],
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  isPro: () => {
    const p = get().profile?.plan
    return p === 'pro' || p === 'business'
  },
  isAdmin: () => get().profile?.email === 'rafael@elabdata.com.br',
  isBusiness: () => get().profile?.plan === 'business',
  canAccess: (module: string) => {
    const plan = get().profile?.plan ?? 'free'
    return MODULE_ACCESS[module]?.includes(plan) ?? false
  },
}))
