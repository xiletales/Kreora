import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { Users, ClipboardList, FileText, Star, CheckCircle, AlertCircle } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Student { nisn: string; name: string; grade: string; class: string }
interface Assignment { id: string; title: string; created_at: string }
interface Submission { id: string; nisn: string; assignment_id: string; grade: string | null }

// ── Helpers ───────────────────────────────────────────────────────────────────

const CLASSES = ['A', 'B', 'C'] as const

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const color =
    clamped >= 75 ? 'bg-brand-500' :
    clamped >= 40 ? 'bg-amber-400' :
    'bg-rose-400'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-sm font-bold text-gray-700 w-10 text-right shrink-0">{clamped}%</span>
    </div>
  )
}

// ── Page (server component) ───────────────────────────────────────────────────

export default async function MonitoringPage() {
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
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null  // middleware handles redirect; this is a safety fallback

  const tid = session.user.id

  // ── Parallel data fetch ────────────────────────────────────────────────────
  const [{ data: rawStudents }, { data: rawAssignments }] = await Promise.all([
    supabase
      .from('students')
      .select('nisn, name, grade, class')
      .eq('added_by', tid),
    supabase
      .from('assignments')
      .select('id, title, created_at')
      .eq('teacher_id', tid)
      .order('created_at', { ascending: false }),
  ])

  const students: Student[] = rawStudents ?? []
  const assignments: Assignment[] = rawAssignments ?? []

  // ── Fetch submissions (only if we have both students + assignments) ─────────
  let submissions: Submission[] = []
  if (students.length > 0 && assignments.length > 0) {
    const { data: subs } = await supabase
      .from('submissions')
      .select('id, nisn, assignment_id, grade')
      .in('nisn', students.map(s => s.nisn))
      .in('assignment_id', assignments.map(a => a.id))
    submissions = subs ?? []
  }

  // ── Stat card values ───────────────────────────────────────────────────────
  const totalStudents    = students.length
  const totalAssignments = assignments.length
  const totalSubmissions = submissions.length
  const totalGraded      = submissions.filter(s => s.grade !== null && s.grade !== '').length

  const STATS = [
    { label: 'Total Siswa',    value: totalStudents,    icon: Users,          color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Total Tugas',    value: totalAssignments, icon: ClipboardList,  color: 'text-blue-600',  bg: 'bg-blue-50'  },
    { label: 'Pengumpulan',    value: totalSubmissions, icon: FileText,       color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Sudah Dinilai',  value: totalGraded,      icon: Star,           color: 'text-rose-500',  bg: 'bg-rose-50'  },
  ]

  // ── Progress per class ─────────────────────────────────────────────────────
  const classProgress = CLASSES.map(cls => {
    const inClass = students.filter(s => s.class === cls)
    const classNisns = new Set(inClass.map(s => s.nisn))
    const submitted = submissions.filter(s => classNisns.has(s.nisn))
    const totalPossible = inClass.length * totalAssignments
    const pct = totalPossible > 0 ? Math.round((submitted.length / totalPossible) * 100) : 0
    return { cls, studentCount: inClass.length, submitted: submitted.length, totalPossible, pct }
  })

  // ── Students who haven't submitted the latest assignment ──────────────────
  const latestAssignment = assignments[0] ?? null
  let notSubmitted: Student[] = []

  if (latestAssignment) {
    const submittedNisns = new Set(
      submissions
        .filter(s => s.assignment_id === latestAssignment.id)
        .map(s => s.nisn)
    )
    notSubmitted = students.filter(s => !submittedNisns.has(s.nisn))
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl">

      {/* ── Header ── */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Guru Dashboard</p>
        <h1 className="font-display text-2xl font-bold text-gray-900">Monitoring</h1>
      </div>

      {/* ── Stat cards ── */}
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

      {/* ── Progress per class ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 mb-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-5">Progress Pengumpulan per Kelas</h2>

        {totalAssignments === 0 ? (
          <p className="text-sm text-gray-400">Belum ada tugas yang dibuat.</p>
        ) : (
          <div className="space-y-5">
            {classProgress.map(({ cls, studentCount, submitted, totalPossible, pct }) => (
              <div key={cls}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">Kelas {cls}</span>
                    <span className="text-xs text-gray-400">{studentCount} siswa</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {submitted} / {totalPossible} pengumpulan
                  </span>
                </div>
                <ProgressBar pct={pct} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Students not submitted (latest assignment) ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Belum Mengumpulkan</h2>
            {latestAssignment ? (
              <p className="text-xs text-gray-400 mt-0.5">
                Tugas terbaru: <span className="font-medium text-gray-600">{latestAssignment.title}</span>
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">Belum ada tugas</p>
            )}
          </div>
          {latestAssignment && notSubmitted.length === 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
              <CheckCircle size={12} /> Semua sudah kumpul
            </span>
          )}
        </div>

        {!latestAssignment ? (
          <div className="text-center py-10 text-gray-400">
            <AlertCircle size={22} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm">Buat tugas terlebih dahulu.</p>
          </div>
        ) : notSubmitted.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle size={28} className="mx-auto mb-2 text-brand-400" />
            <p className="text-sm font-medium text-gray-600">Semua siswa sudah mengumpulkan tugas ini.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notSubmitted.map(st => (
              <div
                key={st.nisn}
                className="flex items-center gap-3 px-4 py-3 bg-rose-50/60 border border-rose-100 rounded-xl"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
                >
                  {st.name[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{st.name}</p>
                </div>
                <span className="text-[10px] font-semibold text-rose-500 bg-rose-100 px-2.5 py-1 rounded-full shrink-0">
                  Kelas {st.grade} {st.class}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
