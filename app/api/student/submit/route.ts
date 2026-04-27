import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const raw = req.cookies.get('kreora_student_session')?.value
    if (!raw) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = JSON.parse(raw)
    const nisn: string = session?.nisn
    if (!nisn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    const assignmentId = form.get('assignment_id') as string | null

    if (!file || !assignmentId) {
      return NextResponse.json({ error: 'File dan tugas wajib diisi.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() ?? 'bin'
    const storagePath = `${assignmentId}/${nisn}/submission.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabaseAdmin.storage
      .from('submissions')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: 'Gagal upload file.' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('submissions')
      .getPublicUrl(storagePath)

    // Upsert submission record (one submission per student per assignment)
    const { error: dbError } = await supabaseAdmin
      .from('submissions')
      .upsert(
        { nisn, assignment_id: assignmentId, file_url: publicUrl },
        { onConflict: 'nisn,assignment_id', ignoreDuplicates: false }
      )

    if (dbError) {
      return NextResponse.json({ error: 'Gagal menyimpan data.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan.' }, { status: 500 })
  }
}
