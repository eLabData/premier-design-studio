'use client'
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { SUPER_ADMIN_EMAIL } from '@/lib/shorts-config'
import type { Profile } from '@/lib/auth-store'

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
  // Super admin always gets pro
  if (email === SUPER_ADMIN_EMAIL) {
    base.plan = 'pro'
  }
  return base
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore()
  const initialized = useRef(false)

  useEffect(() => {
    const supabase = createSupabaseBrowser()

    // Single listener handles EVERYTHING: initial session + changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null
        setUser(user)

        if (user) {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single()
            setProfile(buildProfile(data, user.email))
          } catch {
            // Query failed — still set profile with admin override
            setProfile(buildProfile(null, user.email))
          }
        } else {
          setProfile(null)
        }

        // Only set loading false on first event
        if (!initialized.current) {
          initialized.current = true
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, setLoading])

  return <>{children}</>
}
