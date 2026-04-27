import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client using service role — bypasses RLS for auth lookup
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { nisn, password } = await req.json()

    if (!nisn || !password) {
      return NextResponse.json({ error: 'NISN and password are required.' }, { status: 400 })
    }

    // Look up student by NISN
    const { data: student, error } = await supabaseAdmin
      .from('students')
      .select('id, nisn, first_name, last_name, grade, class, password_hash')
      .eq('nisn', nisn.trim())
      .maybeSingle()

    if (error || !student) {
      return NextResponse.json(
        { error: 'Student account not found. Check your NISN or contact your teacher.' },
        { status: 401 }
      )
    }

    // Simple password check: stored as plain text or nisn+"1" default
    // If password_hash field exists use that, otherwise compare directly
    const expectedPassword = student.password_hash ?? (student.nisn + '1')
    if (password !== expectedPassword) {
      return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 })
    }

    // Build session payload (no sensitive data — cookie is httpOnly but not encrypted)
    const sessionData = {
      id: student.id,
      nisn: student.nisn,
      first_name: student.first_name,
      last_name: student.last_name,
      grade: student.grade,
      class: student.class,
      role: 'student',
    }

    const res = NextResponse.json({ ok: true, student: sessionData })

    // Set httpOnly session cookie — 7 day expiry
    res.cookies.set('kreora_student_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return res
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
