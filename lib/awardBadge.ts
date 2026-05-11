import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { BADGE_BY_NAME } from './badges'

const getAdmin = (): SupabaseClient =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

/**
 * Award a named badge to a student (by nisn).
 * Returns true if the badge was newly awarded, false if it already existed
 * or the insert was rejected.
 */
export async function awardBadge(nisn: string, name: string): Promise<boolean> {
  const def = BADGE_BY_NAME[name]
  if (!def || !nisn) return false

  const sb = getAdmin()

  const { data: existing } = await sb
    .from('badges')
    .select('id')
    .eq('nisn', nisn)
    .eq('name', name)
    .maybeSingle()

  if (existing) return false

  const { error } = await sb.from('badges').insert({
    nisn,
    name,
    description: def.description,
    icon_url: null,
    earned_at: new Date().toISOString(),
  })

  return !error
}

/**
 * Re-evaluate every badge that is decided by the student's submission state.
 * Idempotent: awardBadge already dedupes.
 */
export async function checkSubmissionBadges(nisn: string) {
  const sb = getAdmin()

  // Find this student's teacher to count required assignments
  const { data: studentRow } = await sb
    .from('students').select('added_by').eq('nisn', nisn).maybeSingle()
  const teacherId: string | null = studentRow?.added_by ?? null

  const [{ data: subs }, { data: asgns }] = await Promise.all([
    sb.from('submissions')
      .select('id, assignment_id, submitted_at, assignments(deadline)')
      .eq('nisn', nisn),
    teacherId
      ? sb.from('assignments').select('id').eq('teacher_id', teacherId)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ])

  const submissions = subs ?? []
  const totalAssignments = (asgns ?? []).length

  if (submissions.length >= 1) await awardBadge(nisn, 'First Submit')

  // On-time streak: submissions whose submitted_at <= assignment deadline
  const onTime = submissions.filter(s => {
    const a: { deadline?: string } | undefined = Array.isArray(s.assignments) ? s.assignments[0] : (s.assignments as any)
    if (!a?.deadline) return false
    return new Date(s.submitted_at).getTime() <= new Date(a.deadline).getTime()
  }).length

  if (onTime >= 3) await awardBadge(nisn, 'On Time Streak')

  if (totalAssignments > 0 && submissions.length >= totalAssignments) {
    await awardBadge(nisn, 'All Done')
  }
}

/** Award/refresh grade-driven badges. */
export async function checkGradeBadges(nisn: string) {
  const sb = getAdmin()
  const { data: subs } = await sb
    .from('submissions').select('grade').eq('nisn', nisn)
  const submissions = subs ?? []

  if (submissions.some(s => s.grade === 'A')) {
    await awardBadge(nisn, 'Top Grade')
  }

  const graded = submissions.filter(s => s.grade)
  if (graded.length > 0 && graded.every(s => s.grade === 'A')) {
    await awardBadge(nisn, 'Perfect Score')
  }
}

/** Award the Rising Star badge (called when first feedback is created). */
export async function checkFeedbackBadge(nisn: string) {
  await awardBadge(nisn, 'Rising Star')
}
