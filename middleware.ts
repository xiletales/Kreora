import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Student routes: protected by httpOnly cookie ──────────────────────────
  if (pathname.startsWith('/dashboard/student')) {
    const cookie = req.cookies.get('kreora_student_session')
    if (!cookie?.value) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    try {
      const session = JSON.parse(cookie.value)
      if (!session?.id || session?.role !== 'student') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  }

  // ── Teacher routes: protected by Supabase Auth session ───────────────────
  if (pathname.startsWith('/dashboard/teacher')) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/student/:path*', '/dashboard/teacher/:path*'],
}
