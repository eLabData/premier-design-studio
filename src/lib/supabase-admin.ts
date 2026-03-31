import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client using service role key.
 * Bypasses RLS — use only in server-side API routes.
 */
export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
