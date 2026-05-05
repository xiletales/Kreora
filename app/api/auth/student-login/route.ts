import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const nisn = (body.nisn || '').trim()
    const password = (body.password || '').trim()

    console.log('=== STUDENT LOGIN ATTEMPT ===')
    console.log('nisn:', nisn)
    console.log('password:', password)

    if (!nisn || !password) {
      return NextResponse.json({ error: 'NISN and password are required.' }, { status: 400 })
    }

    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('nisn', nisn)
      .single()

    console.log('student found:', student)
    console.log('fetch error:', error)

    if (error || !student) {
      return NextResponse.json({ error: 'NISN is not registered.' }, { status: 401 })
    }

    const storedPassword = (student.password || '').trim()
    console.log('stored password:', storedPassword)
    console.log('passwords match:', storedPassword === password)

    if (storedPassword !== password) {
      return NextResponse.json({ error: 'NISN or password is incorrect.' }, { status: 401 })
    }

    const sessionData = {
      nisn: student.nisn,
      name: student.name,
      role: 'student',
      grade: student.grade,
      class: student.class,
      added_by: student.added_by,
    }

    const res = NextResponse.json({ success: true, student: sessionData })
    res.cookies.set('kreora_student_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return res
  } catch (err) {
    console.error('Student login error:', err)
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
