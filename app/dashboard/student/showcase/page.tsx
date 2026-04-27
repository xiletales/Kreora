import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ShowcaseClient from './ShowcaseClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function StudentShowcasePage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('kreora_student_session')?.value
  if (!raw) redirect('/login')

  const { nisn } = JSON.parse(raw)

  // Submissions with assignment title
  const { data: rawSubmissions } = await supabaseAdmin
    .from('submissions')
    .select('id, assignment_id, file_url, grade, is_published, created_at, assignments(title)')
    .eq('nisn', nisn)
    .order('created_at', { ascending: false })

  const submissions = rawSubmissions ?? []
  if (submissions.length === 0) {
    return (
      <div className="p-6 sm:p-8 max-w-3xl">
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Dashboard Siswa</p>
          <h1 className="font-display text-2xl font-bold text-gray-900">Showcase</h1>
        </div>
        <p className="text-sm text-gray-400">Belum ada tugas yang dikumpulkan.</p>
      </div>
    )
  }

  const submissionIds = submissions.map(s => s.id)

  // Feedbacks + like counts in parallel (likes table may not exist yet — graceful)
  const [{ data: rawFeedbacks }, likeResult] = await Promise.all([
    supabaseAdmin
      .from('feedbacks')
      .select('id, submission_id, comment, created_at')
      .in('submission_id', submissionIds),
    supabaseAdmin
      .from('likes')
      .select('submission_id', { count: 'exact' })
      .in('submission_id', submissionIds),
  ])

  const feedbacks = rawFeedbacks ?? []
  const likeRows = likeResult.data ?? []

  // Build like count map
  const likeCountMap = new Map<string, number>()
  likeRows.forEach(r => {
    likeCountMap.set(r.submission_id, (likeCountMap.get(r.submission_id) ?? 0) + 1)
  })

  // Build feedback map
  const feedbackMap = new Map<string, typeof feedbacks>()
  feedbacks.forEach(f => {
    const arr = feedbackMap.get(f.submission_id) ?? []
    arr.push(f)
    feedbackMap.set(f.submission_id, arr)
  })

  const data = submissions.map(s => ({
    id: s.id,
    assignment_id: s.assignment_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assignment_title: (s.assignments as any)?.title ?? 'Tugas',
    file_url: s.file_url ?? null,
    grade: s.grade ?? null,
    is_published: s.is_published ?? false,
    created_at: s.created_at,
    like_count: likeCountMap.get(s.id) ?? 0,
    feedbacks: feedbackMap.get(s.id) ?? [],
  }))

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Dashboard Siswa</p>
        <h1 className="font-display text-2xl font-bold text-gray-900">Showcase</h1>
        <p className="text-sm text-gray-400 mt-1">
          {data.filter(s => s.is_published).length} dari {data.length} submission dipublikasikan
        </p>
      </div>

      <ShowcaseClient initialSubmissions={data} />
    </div>
  )
}
