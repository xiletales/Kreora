import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('kreora_student_session')?.value
  if (!raw) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let student: any
  try { student = JSON.parse(raw) } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
  if (!student?.nisn) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { assignment_id, file_url } = await req.json()
  if (!assignment_id || !file_url) {
    return NextResponse.json({ error: 'assignment_id and file_url are required' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('submissions')
    .select('id')
    .eq('assignment_id', assignment_id)
    .eq('nisn', student.nisn)
    .single()

  if (existing) {
    const { error } = await supabaseAdmin
      .from('submissions')
      .update({ file_url, submitted_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, action: 'updated' })
  }

  const { error } = await supabaseAdmin
    .from('submissions')
    .insert({
      assignment_id,
      nisn: student.nisn,
      file_url,
      submitted_at: new Date().toISOString(),
    })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, action: 'created' })
}
