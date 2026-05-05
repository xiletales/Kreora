import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ShowcaseClient from './ShowcaseClient'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function StudentShowcasePage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('kreora_student_session')?.value
  if (!raw) redirect('/login')

  const { nisn } = JSON.parse(raw)

  const { data: rawSubmissions } = await getAdmin()
    .from('submissions')
    .select('id, assignment_id, file_url, grade, is_published, created_at, assignments(title)')
    .eq('nisn', nisn)
    .order('created_at', { ascending: false })

  const submissions = rawSubmissions ?? []
  if (submissions.length === 0) {
    return (
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-6 pb-10">
        <div className="mb-8">
          <p className="text-xs font-semibold text-brand-pink-dark uppercase tracking-widest mb-1">Student Dashboard</p>
          <h1 className="font-display text-2xl font-bold text-gray-800">Showcase</h1>
        </div>
        <div className="bg-white border border-brand-green-dark rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-600">No submissions yet.</p>
        </div>
      </div>
    )
  }

  const submissionIds = submissions.map(s => s.id)

  const [{ data: rawFeedbacks }, likeResult] = await Promise.all([
    getAdmin()
      .from('feedbacks')
      .select('id, submission_id, comment, created_at')
      .in('submission_id', submissionIds),
    getAdmin()
      .from('likes')
      .select('submission_id', { count: 'exact' })
      .in('submission_id', submissionIds),
  ])

  const feedbacks = rawFeedbacks ?? []
  const likeRows = likeResult.data ?? []

  const likeCountMap = new Map<string, number>()
  likeRows.forEach(r => {
    likeCountMap.set(r.submission_id, (likeCountMap.get(r.submission_id) ?? 0) + 1)
  })

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
    assignment_title: (s.assignments as any)?.title ?? 'Assignment',
    file_url: s.file_url ?? null,
    grade: s.grade ?? null,
    is_published: s.is_published ?? false,
    created_at: s.created_at,
    like_count: likeCountMap.get(s.id) ?? 0,
    feedbacks: feedbackMap.get(s.id) ?? [],
  }))

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-6 pb-10">
      <div className="mb-8">
        <p className="text-xs font-semibold text-brand-pink-dark uppercase tracking-widest mb-1">Student Dashboard</p>
        <h1 className="font-display text-2xl font-bold text-gray-800">Showcase</h1>
        <p className="text-sm text-gray-600 mt-1">
          {data.filter(s => s.is_published).length} of {data.length} submissions published
        </p>
      </div>

      <ShowcaseClient initialSubmissions={data} />
    </div>
  )
}
