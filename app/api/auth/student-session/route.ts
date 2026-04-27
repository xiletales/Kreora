import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('kreora_student_session')
  if (!cookie?.value) {
    return NextResponse.json({ student: null })
  }
  try {
    const student = JSON.parse(cookie.value)
    if (!student?.id || student?.role !== 'student') {
      return NextResponse.json({ student: null })
    }
    return NextResponse.json({ student })
  } catch {
    return NextResponse.json({ student: null })
  }
}
