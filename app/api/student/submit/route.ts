import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkSubmissionBadges } from '@/lib/awardBadge'
import { notifyTeacher } from '@/lib/notify'

const getAdmin = () => createClient(
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
      return NextResponse.json({ error: 'File and assignment id are required.' }, { status: 400 })
    }

    const MAX_SIZE = 50 * 1024 * 1024 // 50MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size must be under 50MB.' },
        { status: 400 },
      )
    }

    const ALLOWED_TYPES = ['image/', 'application/pdf', 'video/mp4', 'application/zip']
    const isAllowed = ALLOWED_TYPES.some(t => file.type.startsWith(t))
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Only images, PDF, MP4, and ZIP files are allowed.' },
        { status: 400 },
      )
    }

    const ext = file.name.split('.').pop() ?? 'bin'
    const storagePath = `${assignmentId}/${nisn}/submission.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await getAdmin().storage
      .from('submissions')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 })
    }

    const { data: { publicUrl } } = getAdmin().storage
      .from('submissions')
      .getPublicUrl(storagePath)

    const { error: dbError } = await getAdmin()
      .from('submissions')
      .upsert(
        { nisn, assignment_id: assignmentId, file_url: publicUrl },
        { onConflict: 'nisn,assignment_id', ignoreDuplicates: false }
      )

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save submission.' }, { status: 500 })
    }

    // Side effects — never block the primary response
    try {
      await checkSubmissionBadges(nisn)

      // Notify the assignment's teacher
      const sb = getAdmin()
      const [{ data: asg }, { data: stu }] = await Promise.all([
        sb.from('assignments').select('teacher_id, title').eq('id', assignmentId).maybeSingle(),
        sb.from('students').select('name').eq('nisn', nisn).maybeSingle(),
      ])
      if (asg?.teacher_id) {
        const studentName = stu?.name ?? `Student ${nisn}`
        const title = asg.title ?? 'an assignment'
        await notifyTeacher(asg.teacher_id, 'new_submission', `${studentName} submitted ${title}`)
      }
    } catch (e) {
      console.warn('[submit] post-submit side effects failed:', e)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
