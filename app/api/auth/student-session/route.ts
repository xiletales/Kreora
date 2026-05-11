import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('kreora_student_session')?.value

  if (!raw) {
    return NextResponse.json({ student: null, error: 'Not authenticated' })
  }

  try {
    const student = JSON.parse(raw)
    if (!student?.nisn || student?.role !== 'student') {
      return NextResponse.json({ student: null, error: 'Not authenticated' })
    }
    return NextResponse.json({ student })
  } catch {
    return NextResponse.json({ student: null, error: 'Not authenticated' })
  }
}
