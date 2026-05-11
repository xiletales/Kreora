import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { checkGradeBadges } from '@/lib/awardBadge'
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

  const body = await req.json().catch(() => null) as { submission_id?: string; grade?: string | null } | null
  const submissionId = body?.submission_id
  const grade = body?.grade ?? null
  if (!submissionId) return NextResponse.json({ error: 'submission_id required' }, { status: 400 })
  if (grade !== null && !['A', 'B', 'C', 'D'].includes(grade)) {
    return NextResponse.json({ error: 'Invalid grade' }, { status: 400 })
  }

  const sb = getAdmin()

  // Verify the submission belongs to one of this teacher's assignments
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

  const { error } = await sb.from('submissions').update({ grade }).eq('id', submissionId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Side effects
  try {
    if (grade) {
      await checkGradeBadges(sub.nisn)
      await notifyStudent(
        sub.nisn,
        'grade_received',
        `Your assignment ${asg.title ?? ''} has been graded: ${grade}`.trim(),
      )
    }
  } catch (e) {
    console.warn('[grade] side effects failed:', e)
  }

  return NextResponse.json({ success: true })
}
