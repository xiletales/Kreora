import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ClipboardList, FileText, Star, Award, CheckCircle, Clock } from 'lucide-react'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function statusBadge(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  const days = diff / (1000 * 60 * 60 * 24)
  if (diff < 0) return { label: 'Lewat', cls: 'bg-rose-100 text-rose-600' }
  if (days <= 3) return { label: 'Segera', cls: 'bg-amber-100 text-amber-600' }
  return { label: 'Aktif', cls: 'bg-brand-50 text-brand-600' }
}

export default async function StudentHomePage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('kreora_student_session')?.value
  if (!raw) redirect('/login')

  const session = JSON.parse(raw)
  const { nisn } = session

  // Get student record to find their teacher
  const { data: student } = await getAdmin()
    .from('students')
    .select('added_by')
    .eq('nisn', nisn)
    .single()

  if (!student) redirect('/login')

  const teacherId = student.added_by

  // Parallel: assignments + submissions
  const [{ data: rawAssignments }, { data: rawSubmissions }] = await Promise.all([
    getAdmin()
      .from('assignments')
      .select('id, title, deadline, category')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false }),
    getAdmin()
      .from('submissions')
      .select('id, assignment_id, grade, created_at')
      .eq('nisn', nisn),
  ])

  const assignments = rawAssignments ?? []
  const submissions = rawSubmissions ?? []

  // Badges count
  const submissionIds = submissions.map(s => s.id)
  let badgeCount = 0
  if (submissionIds.length > 0) {
    const { count } = await getAdmin()
      .from('badges')
      .select('id', { count: 'exact', head: true })
      .in('submission_id', submissionIds)
    badgeCount = count ?? 0
  }

  // Recent feedback
  let recentFeedback: { id: string; comment: string; created_at: string; assignment_title: string }[] = []
  if (submissionIds.length > 0) {
    const { data: feedbacks } = await getAdmin()
      .from('feedbacks')
      .select('id, comment, created_at, submission_id')
      .in('submission_id', submissionIds)
      .order('created_at', { ascending: false })
      .limit(4)

    if (feedbacks && feedbacks.length > 0) {
      const subMap = new Map(submissions.map(s => [s.id, s.assignment_id]))
      const asgMap = new Map(assignments.map(a => [a.id, a.title]))
      recentFeedback = feedbacks.map(f => ({
        id: f.id,
        comment: f.comment,
        created_at: f.created_at,
        assignment_title: asgMap.get(subMap.get(f.submission_id) ?? '') ?? 'Tugas',
      }))
    }
  }

  // Stat values
  const submittedIds = new Set(submissions.map(s => s.assignment_id))
  const gradedCount = submissions.filter(s => s.grade !== null && s.grade !== '').length

  const STATS = [
    { label: 'Total Tugas',     value: assignments.length,   icon: ClipboardList, color: 'text-brand-600', bg: 'bg-brand-50'  },
    { label: 'Dikumpulkan',     value: submissions.length,   icon: FileText,      color: 'text-blue-600',  bg: 'bg-blue-50'   },
    { label: 'Sudah Dinilai',   value: gradedCount,          icon: Star,          color: 'text-amber-600', bg: 'bg-amber-50'  },
    { label: 'Badge Diterima',  value: badgeCount,           icon: Award,         color: 'text-rose-500',  bg: 'bg-rose-50'   },
  ]

  const recentAssignments = assignments.slice(0, 4)

  return (
    <div className="p-6 sm:p-8 max-w-4xl">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Dashboard Siswa</p>
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Halo, {session.name.split(' ')[0]} 👋
        </h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
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

      <div className="grid sm:grid-cols-2 gap-6">

        {/* Recent assignments */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Tugas Terbaru</h2>

          {assignments.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada tugas dari guru.</p>
          ) : (
            <div className="space-y-3">
              {recentAssignments.map(a => {
                const submitted = submittedIds.has(a.id)
                const badge = statusBadge(a.deadline)
                return (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${submitted ? 'bg-brand-100' : 'bg-gray-100'}`}>
                      {submitted
                        ? <CheckCircle size={12} className="text-brand-600" />
                        : <Clock size={12} className="text-gray-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(a.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent feedback */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Feedback Terbaru</h2>

          {recentFeedback.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada feedback dari guru.</p>
          ) : (
            <div className="space-y-3">
              {recentFeedback.map(f => (
                <div key={f.id} className="border border-gray-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-brand-600 mb-1 truncate">{f.assignment_title}</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{f.comment}</p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {new Date(f.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
