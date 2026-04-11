'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { SUPER_ADMIN_EMAIL } from '@/lib/shorts-config'

function applyAdminOverride(profile: Record<string, unknown> | null, email?: string) {
  if (!profile) return profile
  if (email === SUPER_ADMIN_EMAIL) {
    return { ...profile, plan: 'pro' }
  }
  return profile
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    const supabase = createSupabaseBrowser()

    // Get initial session
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user) {
        const fallbackProfile = {
          id: user.id, email: user.email, full_name: null, avatar_url: null,
          plan: 'free', stripe_customer_id: null, stripe_subscription_id: null,
        }
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          setProfile(applyAdminOverride(data || fallbackProfile, user.email ?? undefined) as never)
        } catch {
          // If profiles query fails (RLS, network), still set profile with admin override
          setProfile(applyAdminOverride(fallbackProfile, user.email ?? undefined) as never)
        }
      }
      setLoading(false)
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (data) {
          setProfile(applyAdminOverride(data, session.user.email) as never)
        }
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, setLoading])

  return <>{children}</>
}
