/*
 * Seed demo artwork submissions across all 6 categories.
 *   GET /api/seed-artworks
 *
 * Idempotent: safe to call repeatedly.
 *   - Ensures the 6 named students exist for the demo teacher.
 *   - Creates a Painting assignment if the teacher doesn't have one.
 *   - For each of the 6 categories, inserts one published submission
 *     (skipped if that category already has a published submission).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

interface CategorySpec {
  category: string
  imageUrl: string
  nisn: string
  grade: string
  feedback: string
}

const STUDENT_SEEDS = [
  { nisn: '9910001001', name: 'Karina Putri',  grade: 'XI', class: 'A', password: 'karina99100' },
  { nisn: '9910001002', name: 'Radika Rizki',  grade: 'XI', class: 'A', password: 'radika99100' },
  { nisn: '9910001003', name: 'James Chen',    grade: 'XI', class: 'A', password: 'james99100'  },
  { nisn: '9910001004', name: 'Beby Angelia',  grade: 'XI', class: 'B', password: 'beby99100'   },
  { nisn: '9910001005', name: 'Martin Sitepu', grade: 'XI', class: 'B', password: 'martin99100' },
  { nisn: '9910001006', name: 'Lisa Tanaka',   grade: 'XI', class: 'A', password: 'lisa99100'   },
]

const CATEGORY_SEEDS: CategorySpec[] = [
  { category: 'Illustration', imageUrl: 'https://picsum.photos/seed/illustration1/800/1000', nisn: '9910001001', grade: 'A', feedback: 'Strong character work and color choices.' },
  { category: 'Poster',       imageUrl: 'https://picsum.photos/seed/poster1/800/1000',       nisn: '9910001002', grade: 'A', feedback: 'Powerful message and bold typography.' },
  { category: 'Logo',         imageUrl: 'https://picsum.photos/seed/logo1/800/800',          nisn: '9910001003', grade: 'B', feedback: 'Clean and modern. Try refining the spacing.' },
  { category: 'Digital',      imageUrl: 'https://picsum.photos/seed/digital1/800/1000',      nisn: '9910001004', grade: 'A', feedback: 'Beautiful lighting and detail.' },
  { category: 'Painting',     imageUrl: 'https://picsum.photos/seed/watercolor1/800/1000',   nisn: '9910001006', grade: 'A', feedback: 'Beautiful use of watercolor technique.' },
  { category: 'Animation',    imageUrl: 'https://picsum.photos/seed/animation1/800/800',     nisn: '9910001005', grade: 'B', feedback: 'Smooth motion. Add more easing on the bounce.' },
]

const PAINTING_ASSIGNMENT = {
  title: 'Traditional Watercolor Study',
  category: 'Painting',
  deadline: '2026-06-20',
  description: 'Create a watercolor painting inspired by local scenery.',
}

type StepResult = { step: string; ok: boolean; detail?: unknown; error?: string }

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.' },
      { status: 500 },
    )
  }

  const supabase = createClient(url, key)
  const results: StepResult[] = []

  // 1. Find demo teacher
  const { data: teacher, error: teacherErr } = await supabase
    .from('teachers')
    .select('id')
    .eq('username', 'demo_teacher')
    .maybeSingle()

  if (teacherErr || !teacher) {
    return NextResponse.json(
      { ok: false, error: 'demo_teacher not found in teachers table. Run /api/seed-demo first.', detail: teacherErr?.message },
      { status: 404 },
    )
  }
  const teacherId = teacher.id as string
  results.push({ step: 'find demo_teacher', ok: true, detail: { teacherId } })

  // 2. Upsert the 6 demo students linked to this teacher
  {
    const rows = STUDENT_SEEDS.map(s => ({ ...s, added_by: teacherId }))
    const { error } = await supabase
      .from('students')
      .upsert(rows, { onConflict: 'nisn' })
    results.push({
      step: 'upsert demo students',
      ok: !error,
      detail: { count: rows.length },
      error: error?.message,
    })
  }

  // 3. Existing assignments for this teacher
  const { data: assignments, error: aErr } = await supabase
    .from('assignments')
    .select('id, title, category')
    .eq('teacher_id', teacherId)

  if (aErr) {
    return NextResponse.json({ ok: false, error: 'Failed to read assignments', detail: aErr.message }, { status: 500 })
  }
  const assignmentByCategory = new Map<string, string>()
  ;(assignments ?? []).forEach(a => {
    if (a.category && !assignmentByCategory.has(a.category)) {
      assignmentByCategory.set(a.category, a.id as string)
    }
  })
  results.push({ step: 'load assignments', ok: true, detail: Object.fromEntries(assignmentByCategory) })

  // 4. Ensure a Painting assignment exists
  if (!assignmentByCategory.has('Painting')) {
    const { data: newPainting, error: pErr } = await supabase
      .from('assignments')
      .insert({ ...PAINTING_ASSIGNMENT, teacher_id: teacherId })
      .select('id')
      .single()

    if (pErr || !newPainting) {
      results.push({ step: 'insert Painting assignment', ok: false, error: pErr?.message ?? 'no row returned' })
    } else {
      assignmentByCategory.set('Painting', newPainting.id as string)
      results.push({ step: 'insert Painting assignment', ok: true, detail: { id: newPainting.id } })
    }
  } else {
    results.push({ step: 'Painting assignment already present', ok: true })
  }

  // 5. Pull existing students for fallback when preferred NISN is missing
  const { data: studentRows } = await supabase
    .from('students')
    .select('nisn')
    .eq('added_by', teacherId)
  const studentSet = new Set((studentRows ?? []).map(s => s.nisn as string))
  const fallbackNisns = (studentRows ?? []).map(s => s.nisn as string)

  // 6. Find which categories already have a published submission
  const knownAssignmentIds = Array.from(assignmentByCategory.values())
  let publishedAssignmentIds = new Set<string>()
  if (knownAssignmentIds.length > 0) {
    const { data: pubRows } = await supabase
      .from('submissions')
      .select('assignment_id')
      .in('assignment_id', knownAssignmentIds)
      .eq('published', true)
    publishedAssignmentIds = new Set((pubRows ?? []).map(r => r.assignment_id as string))
  }

  // 7. Insert one published submission per missing category
  for (const seed of CATEGORY_SEEDS) {
    const assignmentId = assignmentByCategory.get(seed.category)
    if (!assignmentId) {
      results.push({ step: `submission ${seed.category}`, ok: false, error: 'no assignment for category' })
      continue
    }
    if (publishedAssignmentIds.has(assignmentId)) {
      results.push({ step: `submission ${seed.category}`, ok: true, detail: 'already has published submission' })
      continue
    }

    const nisn = studentSet.has(seed.nisn) ? seed.nisn : fallbackNisns[0]
    if (!nisn) {
      results.push({ step: `submission ${seed.category}`, ok: false, error: 'no students available for this teacher' })
      continue
    }

    const { data: inserted, error: subErr } = await supabase
      .from('submissions')
      .insert({
        assignment_id: assignmentId,
        nisn,
        file_url:  seed.imageUrl,
        grade:     seed.grade,
        feedback:  seed.feedback,
        published: true,
      })
      .select('id')
      .single()

    if (subErr || !inserted) {
      results.push({ step: `submission ${seed.category}`, ok: false, error: subErr?.message ?? 'insert returned no row' })
    } else {
      results.push({ step: `submission ${seed.category}`, ok: true, detail: { id: inserted.id, nisn } })
    }
  }

  const allOk = results.every(r => r.ok)
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 })
}
