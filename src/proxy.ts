import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPER_ADMIN_EMAIL = 'rafael@elabdata.com.br'

// Routes that don't require auth
const PUBLIC_ROUTES = new Set(['/login', '/register', '/forgot-password', '/reset-password', '/terms', '/privacy'])

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  // Skip API webhooks (they have their own signature verification)
  if (pathname.startsWith('/api/webhooks/') || pathname.startsWith('/api/auth/')) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ALWAYS refresh the session — this is what fixes hard refresh
  const { data: { user } } = await supabase.auth.getUser()

  // Public routes — allow through, but redirect to / if already logged in
  if (PUBLIC_ROUTES.has(pathname)) {
    if (user && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // Everything else requires auth
  if (!user) {
    // API routes return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }
    // Page routes redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin routes — only super admin
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (user.email !== SUPER_ADMIN_EMAIL) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
