import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
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

    const { submission_id, is_published } = await req.json()
    if (!submission_id || typeof is_published !== 'boolean') {
      return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('submissions')
      .update({ is_published })
      .eq('id', submission_id)
      .eq('nisn', nisn)

    if (error) return NextResponse.json({ error: 'Gagal memperbarui.' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan.' }, { status: 500 })
  }
}
