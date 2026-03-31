import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function POST() {
  const supabase = await createSupabaseServer()
  await supabase.auth.signOut()

  const response = NextResponse.json({ ok: true })
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

// GET version — simple redirect-based logout (fallback)
export async function GET() {
  const supabase = await createSupabaseServer()
  await supabase.auth.signOut()

  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'https://studio.elabdata.com.br'))
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
