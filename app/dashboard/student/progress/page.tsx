import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle, Clock, TrendingUp, FileText, Star, MessageSquare } from 'lucide-react'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  B: 'text-blue-600 bg-blue-50 border-blue-100',
  C: 'text-amber-600 bg-amber-50 border-amber-100',
  D: 'text-rose-600 bg-rose-50 border-rose-100',
}

const GRADE_POINT: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 }

function ProgressBar({ pct, color = 'bg-brand-500' }: { pct: number; color?: string }) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-600 w-8 text-right shrink-0">{clamped}%</span>
    </div>
  )
}

export default async function StudentProgressPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('kreora_student_session')?.value
  if (!raw) redirect('/login')

  const { nisn } = JSON.parse(raw)

  // Get student's teacher
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('added_by')
    .eq('nisn', nisn)
    .single()

  if (!student) redirect('/login')

  // Parallel: assignments + submissions
  const [{ data: rawAssignments }, { data: rawSubmissions }] = await Promise.all([
    supabaseAdmin
      .from('assignments')
      .select('id, title, deadline, category')
      .eq('teacher_id', student.added_by)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('submissions')
      .select('id, assignment_id, grade, created_at')
      .eq('nisn', nisn),
  ])

  const assignments = rawAssignments ?? []
  const submissions = rawSubmissions ?? []

  // Feedbacks
  let feedbacks: { id: string; comment: string; created_at: string; assignment_id: string }[] = []
  if (submissions.length > 0) {
    const { data: rawFeedbacks } = await supabaseAdmin
      .from('feedbacks')
      .select('id, comment, created_at, submission_id')
      .in('submission_id', submissions.map(s => s.id))
      .order('created_at', { ascending: false })

    const subToAssignment = new Map(submissions.map(s => [s.id, s.assignment_id]))
    feedbacks = (rawFeedbacks ?? []).map(f => ({
      id: f.id,
      comment: f.comment,
      created_at: f.created_at,
      assignment_id: subToAssignment.get(f.submission_id) ?? '',
    }))
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total = assignments.length
  const submitted = submissions.length
  const submissionRate = total > 0 ? Math.round((submitted / total) * 100) : 0

  const graded = submissions.filter(s => s.grade)
  const avgPoint = graded.length > 0
    ? graded.reduce((acc, s) => acc + (GRADE_POINT[s.grade!] ?? 0), 0) / graded.length
    : null

  const avgLabel = avgPoint === null ? '—'
    : avgPoint >= 3.5 ? 'A'
    : avgPoint >= 2.5 ? 'B'
    : avgPoint >= 1.5 ? 'C'
    : 'D'

  const gradeDistribution = ['A', 'B', 'C', 'D'].map(g => ({
    grade: g,
    count: graded.filter(s => s.grade === g).length,
  }))

  // Submission map
  const subMap = new Map(submissions.map(s => [s.assignment_id, s]))

  const STATS = [
    { label: 'Total Tugas',    value: total,            icon: FileText,     color: 'text-brand-600',  bg: 'bg-brand-50'  },
    { label: 'Dikumpulkan',    value: submitted,         icon: CheckCircle,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Sudah Dinilai',  value: graded.length,    icon: Star,         color: 'text-amber-600',  bg: 'bg-amber-50'  },
    { label: 'Rata-rata Nilai',value: avgLabel,          icon: TrendingUp,   color: 'text-rose-500',   bg: 'bg-rose-50'   },
  ]

  return (
    <div className="p-6 sm:p-8 max-w-3xl">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Dashboard Siswa</p>
        <h1 className="font-display text-2xl font-bold text-gray-900">Progress</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {STATS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 transition-colors">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            <p className="font-display text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Submission progress */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-sm">Progress Pengumpulan</h2>
          <span className="text-xs text-gray-400">{submitted} / {total} tugas</span>
        </div>
        <ProgressBar pct={submissionRate} />

        {/* Grade distribution */}
        {graded.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-50">
            <p className="text-xs font-semibold text-gray-500 mb-3">Distribusi Nilai</p>
            <div className="flex items-center gap-2">
              {gradeDistribution.map(({ grade, count }) => (
                <div
                  key={grade}
                  className={`flex-1 text-center py-2 rounded-xl border text-xs font-bold ${GRADE_COLOR[grade] ?? 'text-gray-600 bg-gray-50 border-gray-100'}`}
                >
                  <div className="text-base font-display">{grade}</div>
                  <div className="opacity-70">{count}x</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task checklist */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 mb-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">Checklist Tugas</h2>

        {assignments.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada tugas dari guru.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map(a => {
              const sub = subMap.get(a.id)
              const submitted = !!sub
              const pastDeadline = new Date(a.deadline).getTime() < Date.now()

              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                    submitted ? 'bg-brand-50/50 border-brand-100' : 'bg-gray-50/50 border-gray-100'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    submitted ? 'bg-brand-100' : 'bg-gray-100'
                  }`}>
                    {submitted
                      ? <CheckCircle size={12} className="text-brand-600" />
                      : <Clock size={12} className="text-gray-400" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${submitted ? 'text-gray-900' : 'text-gray-500'}`}>
                      {a.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(a.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sub?.grade && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${GRADE_COLOR[sub.grade] ?? 'text-gray-600 bg-gray-50 border-gray-100'}`}>
                        {sub.grade}
                      </span>
                    )}
                    {!submitted && pastDeadline && (
                      <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                        Lewat
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Teacher feedback */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={15} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900 text-sm">Feedback dari Guru</h2>
          {feedbacks.length > 0 && (
            <span className="ml-auto text-xs text-gray-400">{feedbacks.length} feedback</span>
          )}
        </div>

        {feedbacks.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada feedback dari guru.</p>
        ) : (
          <div className="space-y-3">
            {feedbacks.map(f => {
              const asg = assignments.find(a => a.id === f.assignment_id)
              return (
                <div key={f.id} className="border border-gray-100 rounded-xl p-4">
                  {asg && (
                    <p className="text-[10px] font-semibold text-brand-600 uppercase tracking-wide mb-2">
                      {asg.title}
                    </p>
                  )}
                  <p className="text-sm text-gray-700">{f.comment}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(f.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
