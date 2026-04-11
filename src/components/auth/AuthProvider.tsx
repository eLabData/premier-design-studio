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

  const loadProfile = useCallback((user: User) => {
    // Set a basic profile IMMEDIATELY so the app doesn't block
    const immediateProfile = buildProfile(null, user.email)
    setProfile(immediateProfile)

    // Then try to enrich with DB data (non-blocking)
    const supabase = createSupabaseBrowser()
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.warn('[AuthProvider] profiles query error:', error.message)
        }
        if (data) {
          setProfile(buildProfile(data, user.email))
        }
      })
  }, [setProfile])

  useEffect(() => {
    const supabase = createSupabaseBrowser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthProvider] event:', event, session?.user?.email)
        const user = session?.user ?? null
        setUser(user)

        if (user) {
          loadProfile(user)
        } else {
          setProfile(null)
        }

        // Always set loading false on first event
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
