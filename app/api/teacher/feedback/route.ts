import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { checkFeedbackBadge } from '@/lib/awardBadge'
import { notifyStudent } from '@/lib/notify'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    },
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as { submission_id?: string; comment?: string } | null
  const submissionId = body?.submission_id
  const comment = body?.comment?.trim()
  if (!submissionId || !comment) {
    return NextResponse.json({ error: 'submission_id and comment required' }, { status: 400 })
  }

  const sb = getAdmin()

  const { data: sub } = await sb
    .from('submissions')
    .select('id, nisn, assignment_id, assignments!inner(title, teacher_id)')
    .eq('id', submissionId)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asg: any = Array.isArray(sub?.assignments) ? sub?.assignments[0] : sub?.assignments
  if (!sub || !asg || asg.teacher_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: inserted, error } = await sb
    .from('feedbacks')
    .insert({ submission_id: submissionId, teacher_id: session.user.id, comment })
    .select('id, submission_id, comment, created_at')
    .single()

  if (error || !inserted) return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 })

  // Side effects
  try {
    await checkFeedbackBadge(sub.nisn)
    await notifyStudent(
      sub.nisn,
      'feedback_received',
      `Your teacher left feedback on ${asg.title ?? 'your assignment'}`,
    )
  } catch (e) {
    console.warn('[feedback] side effects failed:', e)
  }

  return NextResponse.json({ success: true, feedback: inserted })
}
