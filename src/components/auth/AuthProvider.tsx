'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { SUPER_ADMIN_EMAIL } from '@/lib/shorts-config'
import type { Profile } from '@/lib/auth-store'
import type { User } from '@supabase/supabase-js'

function buildProfile(data: Record<string, unknown> | null, email?: string | null): Profile {
  const base: Profile = {
    id: (data?.id as string) ?? '',
    email: (data?.email as string) ?? email ?? '',
    full_name: (data?.full_name as string) ?? null,
    avatar_url: (data?.avatar_url as string) ?? null,
    plan: (data?.plan as Profile['plan']) ?? 'free',
    stripe_customer_id: (data?.stripe_customer_id as string) ?? null,
    stripe_subscription_id: (data?.stripe_subscription_id as string) ?? null,
  }
  if (email === SUPER_ADMIN_EMAIL) {
    base.plan = 'business'
  }
  return base
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore()
  const initialized = useRef(false)

  const loadProfile = useCallback(async (user: User) => {
    const supabase = createSupabaseBrowser()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.warn('[AuthProvider] profiles query error:', error.message, '— using fallback')
    }

    const profile = buildProfile(data, user.email)
    console.log('[AuthProvider] Setting profile:', user.email, 'plan:', profile.plan)
    setProfile(profile)
  }, [setProfile])

  useEffect(() => {
    const supabase = createSupabaseBrowser()

    // 1. Try getUser immediately (works if proxy refreshed the cookies)
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        console.log('[AuthProvider] getUser found:', user.email)
        setUser(user)
        await loadProfile(user)
      } else {
        console.log('[AuthProvider] getUser: no user')
        setUser(null)
        setProfile(null)
      }
      if (!initialized.current) {
        initialized.current = true
        setLoading(false)
      }
    })

    // 2. Also listen for changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthProvider] onAuthStateChange:', event)
        const user = session?.user ?? null
        setUser(user)

        if (user) {
          await loadProfile(user)
        } else {
          setProfile(null)
        }

        if (!initialized.current) {
          initialized.current = true
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, setLoading, loadProfile])

  return <>{children}</>
}
