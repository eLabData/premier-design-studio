import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function POST() {
  const supabase = await createSupabaseServer()
  await supabase.auth.signOut()

  // Clear all supabase cookies by redirecting
  const response = NextResponse.json({ ok: true })

  // Clear auth cookies
  const cookieNames = [
    'sb-vhkkkdcjbexqgutnbkde-auth-token',
    'sb-vhkkkdcjbexqgutnbkde-auth-token.0',
    'sb-vhkkkdcjbexqgutnbkde-auth-token.1',
  ]

  for (const name of cookieNames) {
    response.cookies.set(name, '', { maxAge: 0, path: '/' })
  }

  return response
}
