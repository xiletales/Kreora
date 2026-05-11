import { NextResponse } from 'next/server'

function clearSession() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('kreora_student_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return res
}

export async function POST()   { return clearSession() }
export async function DELETE() { return clearSession() }
