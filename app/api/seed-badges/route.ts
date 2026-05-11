import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEMO_BADGES = [
  {
    badge_type: 'First Submission',
    description: 'Awarded for your very first assignment submission.',
    icon_url: 'https://api.dicebear.com/7.x/icons/svg?seed=first-submission&backgroundColor=337357',
  },
  {
    badge_type: 'Creative Star',
    description: 'Recognized for outstanding creativity in your work.',
    icon_url: 'https://api.dicebear.com/7.x/icons/svg?seed=creative-star&backgroundColor=E27396',
  },
  {
    badge_type: 'Published Artist',
    description: 'Earned by publishing a submission to the gallery.',
    icon_url: 'https://api.dicebear.com/7.x/icons/svg?seed=published-artist&backgroundColor=EA9AB2',
  },
]

export async function GET() {
  const supabase = getAdmin()

  const cookieStore = await cookies()
  const raw = cookieStore.get('kreora_student_session')?.value
  if (!raw) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let session: { nisn?: string }
  try { session = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid session' }, { status: 401 }) }
  const nisn = session.nisn
  if (!nisn) return NextResponse.json({ error: 'No NISN in session' }, { status: 401 })

  // Inspect the badges table schema by sampling one row
  const { data: sample, error: sampleErr } = await supabase
    .from('badges')
    .select('*')
    .limit(1)

  if (sampleErr) {
    return NextResponse.json({ error: 'Failed to read badges table', detail: sampleErr.message }, { status: 500 })
  }

  const knownColumns = sample && sample[0] ? Object.keys(sample[0]) : []

  // Find the student's most recent submission to attach badges to (if submission_id is required)
  const { data: subs } = await supabase
    .from('submissions')
    .select('id, created_at')
    .eq('nisn', nisn)
    .order('created_at', { ascending: false })
    .limit(1)

  const submissionId = subs?.[0]?.id ?? null

  // Build rows defensively — only include columns that the table actually has
  const rows = DEMO_BADGES.map(b => {
    const row: Record<string, unknown> = {}

    // Always include badge_type if column exists
    if (knownColumns.length === 0 || knownColumns.includes('badge_type')) {
      row.badge_type = b.badge_type
    }

    // Description / icon
    if (knownColumns.includes('description')) row.description = b.description
    if (knownColumns.includes('icon_url'))    row.icon_url    = b.icon_url
    if (knownColumns.includes('image_url'))   row.image_url   = b.icon_url
    if (knownColumns.includes('name'))        row.name        = b.badge_type
    if (knownColumns.includes('title'))       row.title       = b.badge_type

    // Student linkage — try multiple known patterns
    if (knownColumns.includes('nisn'))         row.nisn         = nisn
    if (knownColumns.includes('student_nisn')) row.student_nisn = nisn
    if (knownColumns.includes('student_id'))   row.student_id   = nisn

    // Submission linkage
    if (knownColumns.includes('submission_id') && submissionId) {
      row.submission_id = submissionId
    }

    // If no rows in sample yet, fall back to a baseline shape
    if (knownColumns.length === 0) {
      row.nisn = nisn
      if (submissionId) row.submission_id = submissionId
    }

    return row
  })

  const { data: inserted, error: insertErr } = await supabase
    .from('badges')
    .insert(rows)
    .select()

  if (insertErr) {
    return NextResponse.json(
      { error: 'Failed to insert badges', detail: insertErr.message, knownColumns, rows },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    inserted: inserted?.length ?? 0,
    badges: inserted,
    knownColumns,
  })
}
