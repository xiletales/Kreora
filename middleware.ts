import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'

function makeSupabase(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: object) {
          res.cookies.set({ name, value, ...(options as Record<string, unknown>) })
        },
        remove(name: string, options: object) {
          res.cookies.set({ name, value: '', ...(options as Record<string, unknown>) })
        },
      },
    }
  )
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── /login: redirect already-authenticated users ──────────────────────────
  if (pathname === '/login') {
    const studentCookie = req.cookies.get('kreora_student_session')
    if (studentCookie?.value) {
      try {
        const s = JSON.parse(studentCookie.value)
        if (s?.nisn && s?.role === 'student') {
          return NextResponse.redirect(new URL('/dashboard/student', req.url))
        }
      } catch { /* invalid cookie */ }
    }

    const res = NextResponse.next()
    const supabase = makeSupabase(req, res)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      return NextResponse.redirect(new URL('/dashboard/teacher', req.url))
    }
    return res
  }

  // ── /dashboard (root): redirect to the right dashboard ───────────────────
  if (pathname === '/dashboard') {
    const studentCookie = req.cookies.get('kreora_student_session')
    if (studentCookie?.value) {
      try {
        const s = JSON.parse(studentCookie.value)
        if (s?.nisn && s?.role === 'student') {
          return NextResponse.redirect(new URL('/dashboard/student', req.url))
        }
      } catch { /* fall through */ }
    }

    const res = NextResponse.next()
    const supabase = makeSupabase(req, res)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      return NextResponse.redirect(new URL('/dashboard/teacher', req.url))
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // ── /dashboard/student/*: protected by httpOnly cookie ───────────────────
  if (pathname.startsWith('/dashboard/student')) {
    const cookie = req.cookies.get('kreora_student_session')
    if (!cookie?.value) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    try {
      const session = JSON.parse(cookie.value)
      if (!session?.nisn || session?.role !== 'student') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  }

  // ── /dashboard/teacher/*: protected by Supabase Auth session ─────────────
  if (pathname.startsWith('/dashboard/teacher')) {
    const res = NextResponse.next()
    const supabase = makeSupabase(req, res)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/login', '/dashboard', '/dashboard/student/:path*', '/dashboard/teacher/:path*'],
}
