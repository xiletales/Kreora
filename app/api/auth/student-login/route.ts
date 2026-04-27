import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS for student auth lookup
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const nisn: string = (body.nisn ?? '').trim()
    const password: string = body.password ?? ''

    if (!nisn || !password) {
      return NextResponse.json({ error: 'NISN dan password wajib diisi.' }, { status: 400 })
    }

    // Look up student by NISN (students table uses 'name' single field, not first/last)
    const { data: student, error } = await supabaseAdmin
      .from('students')
      .select('nisn, name, grade, class, department, password_hash, photo_url, display_name')
      .eq('nisn', nisn)
      .maybeSingle()

    if (error || !student) {
      return NextResponse.json(
        { error: 'NISN atau password salah.' },
        { status: 401 }
      )
    }

    // Password check — stored in password_hash as plain text (nisn + "1" default)
    const expectedPassword = student.password_hash ?? (nisn + '1')
    if (password !== expectedPassword) {
      return NextResponse.json(
        { error: 'NISN atau password salah.' },
        { status: 401 }
      )
    }

    // Session payload stored in cookie (no sensitive data)
    const sessionData = {
      role: 'student',
      nisn: student.nisn,
      name: student.display_name || student.name,
      grade: student.grade,
      class: student.class,
      department: student.department ?? '',
      photo_url: student.photo_url ?? null,
    }

    const res = NextResponse.json({ success: true, redirect: '/dashboard/student' })

    res.cookies.set('kreora_student_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return res
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 })
  }
}
