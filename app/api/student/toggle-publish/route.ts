import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(req: NextRequest) {
  try {
    const raw = req.cookies.get('kreora_student_session')?.value
    if (!raw) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = JSON.parse(raw)
    const nisn: string = session?.nisn
    if (!nisn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const submission_id = body.submission_id as string | undefined
    const published = (body.published ?? body.is_published) as boolean | undefined
    if (!submission_id || typeof published !== 'boolean') {
      return NextResponse.json({ error: 'Invalid data.' }, { status: 400 })
    }

    const { error } = await getAdmin()
      .from('submissions')
      .update({ published })
      .eq('id', submission_id)
      .eq('nisn', nisn)

    if (error) return NextResponse.json({ error: 'Failed to update.' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan.' }, { status: 500 })
  }
}
