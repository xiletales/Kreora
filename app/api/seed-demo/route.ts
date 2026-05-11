/*
 * Seed demo data for the Kreora app.
 *
 * Visit:  http://localhost:3000/api/seed-demo
 *
 * Prerequisite: a Supabase Auth user must exist with id =
 *   00000000-0000-0000-0000-000000000001
 * (use email demo_teacher@kreora.teacher / password demo123).
 *
 * The endpoint is idempotent — every step uses upsert.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const TEACHER_ID = '00000000-0000-0000-0000-000000000001'

const STUDENTS = [
  { id: '00000000-0000-0000-0000-000000000010', nisn: '1234567890', name: 'Karina Putri',   grade: 'XI', class: 'A', password: '12345678901', added_by: TEACHER_ID },
  { id: '00000000-0000-0000-0000-000000000011', nisn: '1234567891', name: 'Radika Rizki',   grade: 'XI', class: 'A', password: '12345678911', added_by: TEACHER_ID },
  { id: '00000000-0000-0000-0000-000000000012', nisn: '1234567892', name: 'James Chen',     grade: 'XI', class: 'A', password: '12345678921', added_by: TEACHER_ID },
  { id: '00000000-0000-0000-0000-000000000013', nisn: '1234567893', name: 'Beby Angelia',   grade: 'XI', class: 'B', password: '12345678931', added_by: TEACHER_ID },
  { id: '00000000-0000-0000-0000-000000000014', nisn: '1234567894', name: 'Martin Sitepu',  grade: 'XI', class: 'B', password: '12345678941', added_by: TEACHER_ID },
  { id: '00000000-0000-0000-0000-000000000015', nisn: '1234567895', name: 'Lisa Tanaka',    grade: 'XI', class: 'A', password: '12345678951', added_by: TEACHER_ID },
]

const ASSIGNMENTS = [
  { id: '00000000-0000-0000-0000-000000000020', title: 'Illustration Character Design', category: 'Illustration', deadline: '2026-05-30', description: 'Create an original character illustration with full color.', teacher_id: TEACHER_ID },
  { id: '00000000-0000-0000-0000-000000000021', title: 'Anti-Bullying Poster',          category: 'Poster',       deadline: '2026-05-20', description: 'Design a poster campaign against bullying.',           teacher_id: TEACHER_ID },
  { id: '00000000-0000-0000-0000-000000000022', title: 'School Brand Logo',             category: 'Logo',         deadline: '2026-06-10', description: 'Create a modern logo for a fictional school brand.',  teacher_id: TEACHER_ID },
  { id: '00000000-0000-0000-0000-000000000023', title: 'Digital Portrait',              category: 'Digital',      deadline: '2026-05-25', description: 'Paint a digital portrait using any software.',         teacher_id: TEACHER_ID },
  { id: '00000000-0000-0000-0000-000000000024', title: 'Motion Graphics Introduction',  category: 'Animation',    deadline: '2026-06-15', description: 'Create a 10 second motion graphic animation.',        teacher_id: TEACHER_ID },
]

// Submissions key students by nisn (the schema column).
const SUBMISSIONS = [
  { id: '00000000-0000-0000-0000-000000000030', nisn: '1234567890', assignment_id: '00000000-0000-0000-0000-000000000020', file_url: 'https://picsum.photos/seed/art1/800/600', grade: 'A', feedback: 'Excellent character design. The color palette is very cohesive.', published: true,  submitted_at: '2026-04-10T10:00:00Z' },
  { id: '00000000-0000-0000-0000-000000000031', nisn: '1234567891', assignment_id: '00000000-0000-0000-0000-000000000021', file_url: 'https://picsum.photos/seed/art2/800/600', grade: 'A', feedback: 'Very powerful message. Typography could be improved.',              published: true,  submitted_at: '2026-04-12T10:00:00Z' },
  { id: '00000000-0000-0000-0000-000000000032', nisn: '1234567892', assignment_id: '00000000-0000-0000-0000-000000000022', file_url: 'https://picsum.photos/seed/art3/800/600', grade: 'B', feedback: 'Clean and modern. Try adding more personality.',                    published: true,  submitted_at: '2026-04-14T10:00:00Z' },
  { id: '00000000-0000-0000-0000-000000000033', nisn: '1234567893', assignment_id: '00000000-0000-0000-0000-000000000023', file_url: 'https://picsum.photos/seed/art4/800/600', grade: 'A', feedback: 'Beautiful lighting and shading.',                                  published: true,  submitted_at: '2026-04-16T10:00:00Z' },
  { id: '00000000-0000-0000-0000-000000000034', nisn: '1234567894', assignment_id: '00000000-0000-0000-0000-000000000020', file_url: 'https://picsum.photos/seed/art5/800/600', grade: null, feedback: null,                                                              published: false, submitted_at: '2026-04-18T10:00:00Z' },
  { id: '00000000-0000-0000-0000-000000000035', nisn: '1234567895', assignment_id: '00000000-0000-0000-0000-000000000021', file_url: 'https://picsum.photos/seed/art6/800/600', grade: null, feedback: null,                                                              published: false, submitted_at: '2026-04-20T10:00:00Z' },
]

const ARTWORKS = [
  { id: '00000000-0000-0000-0000-000000000040', title: 'Sakura Character',     category: 'Illustration', status: 'published', image_url: 'https://picsum.photos/seed/artwork1/800/1000', likes: 31, creator_id: '00000000-0000-0000-0000-000000000010' },
  { id: '00000000-0000-0000-0000-000000000041', title: 'Stop Bullying Campaign', category: 'Poster',     status: 'published', image_url: 'https://picsum.photos/seed/artwork2/800/600',  likes: 90, creator_id: '00000000-0000-0000-0000-000000000011' },
  { id: '00000000-0000-0000-0000-000000000042', title: 'EduBrand Logo',          category: 'Logo',       status: 'published', image_url: 'https://picsum.photos/seed/artwork3/800/800',  likes: 55, creator_id: '00000000-0000-0000-0000-000000000012' },
  { id: '00000000-0000-0000-0000-000000000043', title: 'Digital Self Portrait', category: 'Digital',     status: 'published', image_url: 'https://picsum.photos/seed/artwork4/800/1000', likes: 72, creator_id: '00000000-0000-0000-0000-000000000013' },
  { id: '00000000-0000-0000-0000-000000000044', title: 'Abstract Flow',         category: 'Illustration', status: 'published', image_url: 'https://picsum.photos/seed/artwork5/800/600',  likes: 48, creator_id: '00000000-0000-0000-0000-000000000014' },
  { id: '00000000-0000-0000-0000-000000000045', title: 'Eco Awareness Poster',  category: 'Poster',      status: 'published', image_url: 'https://picsum.photos/seed/artwork6/800/1000', likes: 63, creator_id: '00000000-0000-0000-0000-000000000015' },
]

type StepResult = { step: string; ok: boolean; count?: number; note?: string; error?: string }

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

  // STEP A — auth user creation skipped, must already exist.
  results.push({
    step: 'A. auth.users (manual)',
    ok: true,
    note: `Auth user ${TEACHER_ID} must already exist. Create it manually in Supabase Auth with email demo_teacher@kreora.teacher and password demo123.`,
  })

  // STEP B — teachers
  {
    const teacher = {
      id:         TEACHER_ID,
      username:   'demo_teacher',
      name:       'Demo Teacher',
      grade:      'XI',
      class:      'A',
      department: 'Visual Communication Design',
      subject:    'Illustration & Poster Design',
    }
    const { error } = await supabase.from('teachers').upsert(teacher, { onConflict: 'id' })
    results.push({ step: 'B. teachers', ok: !error, count: error ? 0 : 1, error: error?.message })
  }

  // STEP C — students
  {
    const { error, count } = await supabase
      .from('students')
      .upsert(STUDENTS, { onConflict: 'nisn', count: 'exact' })
    results.push({ step: 'C. students', ok: !error, count: count ?? STUDENTS.length, error: error?.message })
  }

  // STEP D — assignments
  {
    const { error, count } = await supabase
      .from('assignments')
      .upsert(ASSIGNMENTS, { onConflict: 'id', count: 'exact' })
    results.push({ step: 'D. assignments', ok: !error, count: count ?? ASSIGNMENTS.length, error: error?.message })
  }

  // STEP E — submissions
  {
    const { error, count } = await supabase
      .from('submissions')
      .upsert(SUBMISSIONS, { onConflict: 'id', count: 'exact' })
    results.push({ step: 'E. submissions', ok: !error, count: count ?? SUBMISSIONS.length, error: error?.message })
  }

  // STEP F — artworks (optional table)
  {
    const { error, count } = await supabase
      .from('artworks')
      .upsert(ARTWORKS, { onConflict: 'id', count: 'exact' })
    if (error && (error.code === '42P01' || /does not exist/i.test(error.message))) {
      results.push({ step: 'F. artworks', ok: true, count: 0, note: 'Table "artworks" does not exist — skipped.' })
    } else {
      results.push({ step: 'F. artworks', ok: !error, count: count ?? ARTWORKS.length, error: error?.message })
    }
  }

  const allOk = results.every(r => r.ok)
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 })
}
