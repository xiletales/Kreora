'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ClipboardList, FileText, Star, Loader2, Calendar } from 'lucide-react'

interface StudentSession {
  nisn: string
  name: string
  grade?: string
  class?: string
  role: 'student'
}

interface Assignment {
  id: string
  title: string
  category: string
  deadline: string
  description: string | null
}

interface Submission {
  id: string
  assignment_id: string
  file_url: string | null
  submitted_at: string
  grade: string | number | null
  feedback?: string | null
  assignmentTitle: string
  assignmentCategory: string
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusBadge(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: 'Past due', cls: 'bg-rose-100 text-rose-600' }
  if (days <= 3) return { label: `${days}d left`, cls: 'bg-amber-100 text-amber-700' }
  return { label: 'Active', cls: 'bg-[#337357]/10 text-[#337357]' }
}

const containerVariants = { show: { transition: { staggerChildren: 0.07 } } }
const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

export default function StudentDashboardPage() {
  const [session, setSession] = useState<StudentSession | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/auth/student-session', { cache: 'no-store' })
        const json = await res.json()

        if (!json?.student?.nisn) {
          setError('Not authenticated')
          setLoading(false)
          return
        }
        const stu: StudentSession = json.student
        setSession(stu)

        // Find this student's teacher via the added_by column
        const { data: studentRow } = await supabase
          .from('students')
          .select('added_by')
          .eq('nisn', stu.nisn)
          .maybeSingle()

        const teacherId = (studentRow as { added_by?: string } | null)?.added_by ?? null

        const [{ data: rawAssignments }, { data: rawSubs }] = await Promise.all([
          teacherId
            ? supabase
                .from('assignments')
                .select('id, title, category, deadline, description')
                .eq('teacher_id', teacherId)
                .order('deadline', { ascending: true })
            : Promise.resolve({ data: [] as Assignment[] }),
          supabase
            .from('submissions')
            .select('id, assignment_id, file_url, submitted_at, grade, feedback, assignments(title, category)')
            .eq('nisn', stu.nisn)
            .order('submitted_at', { ascending: false }),
        ])

        setAssignments((rawAssignments ?? []) as Assignment[])

        const builtSubs: Submission[] = (rawSubs ?? []).map((s: any) => {
          const asgn = Array.isArray(s.assignments) ? s.assignments[0] : s.assignments
          return {
            id: s.id,
            assignment_id: s.assignment_id,
            file_url: s.file_url,
            submitted_at: s.submitted_at,
            grade: s.grade ?? null,
            feedback: s.feedback ?? null,
            assignmentTitle: asgn?.title ?? 'Assignment',
            assignmentCategory: asgn?.category ?? '',
          }
        })
        setSubmissions(builtSubs)
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-6 w-full flex items-center justify-center min-h-[60vh]">
        <Loader2 size={22} className="animate-spin text-[#337357]" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="p-6 w-full flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="font-semibold text-[#1a2e25]">{error ?? 'Session not found'}</p>
        <p className="text-sm text-[#5a7a6a] mt-1">Please log in to view the student dashboard.</p>
      </div>
    )
  }

  const submittedIds = new Set(submissions.map(s => s.assignment_id))

  return (
    <motion.div
      className="p-6 w-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="mb-8 pl-4 border-l-4 border-[#337357]">
        <h1 className="text-2xl font-bold text-[#1a2e25]">Welcome, {session.name}</h1>
        <p className="text-sm text-[#5a7a6a] mt-0.5">
          {session.grade && session.class ? `Grade ${session.grade} · Class ${session.class}` : 'Student dashboard'}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#FFDBE5] rounded-xl p-5 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-[#FFDBE5]/40 flex items-center justify-center mb-3">
            <ClipboardList size={17} className="text-[#E27396]" />
          </div>
          <p className="text-2xl font-bold text-[#1a2e25]">{assignments.length}</p>
          <p className="text-xs text-[#5a7a6a] mt-0.5 font-medium">Assignments from teacher</p>
        </div>
        <div className="bg-white border border-[#E5EDE9] rounded-xl p-5 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-[#337357]/10 flex items-center justify-center mb-3">
            <FileText size={17} className="text-[#337357]" />
          </div>
          <p className="text-2xl font-bold text-[#1a2e25]">{submissions.length}</p>
          <p className="text-xs text-[#5a7a6a] mt-0.5 font-medium">Your submissions</p>
        </div>
        <div className="bg-white border border-[#E5EDE9] rounded-xl p-5 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
            <Star size={17} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-[#1a2e25]">
            {submissions.filter(s => s.grade !== null && s.grade !== '').length}
          </p>
          <p className="text-xs text-[#5a7a6a] mt-0.5 font-medium">Graded</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Assignments */}
        <section className="bg-white border border-[#E5EDE9] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E5EDE9] bg-[#F8FAF9] flex items-center justify-between">
            <h2 className="font-semibold text-[#1a2e25] text-sm">My Assignments</h2>
            <span className="text-xs text-[#5a7a6a]">{assignments.length}</span>
          </div>

          {assignments.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#5a7a6a]">
              No assignments yet from your teacher.
            </div>
          ) : (
            <motion.ul
              className="divide-y divide-[#E5EDE9]"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {assignments.map(a => {
                const submitted = submittedIds.has(a.id)
                const badge = statusBadge(a.deadline)
                return (
                  <motion.li key={a.id} variants={itemVariants} className="px-5 py-4 flex items-start gap-3">
                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      submitted ? 'bg-[#337357]/10' : 'bg-[#FFDBE5]/40'
                    }`}>
                      <Calendar size={14} className={submitted ? 'text-[#337357]' : 'text-[#E27396]'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[#1a2e25] truncate">{a.title}</p>
                        <span className="text-[10px] font-semibold text-[#5a7a6a] bg-[#F8FAF9] border border-[#E5EDE9] px-2 py-0.5 rounded-full">
                          {a.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#5a7a6a] mt-0.5">Due {fmt(a.deadline)}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                      submitted ? 'bg-[#337357]/10 text-[#337357]' : badge.cls
                    }`}>
                      {submitted ? 'Submitted' : badge.label}
                    </span>
                  </motion.li>
                )
              })}
            </motion.ul>
          )}
        </section>

        {/* My Submissions */}
        <section className="bg-white border border-[#E5EDE9] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E5EDE9] bg-[#F8FAF9] flex items-center justify-between">
            <h2 className="font-semibold text-[#1a2e25] text-sm">My Submissions</h2>
            <span className="text-xs text-[#5a7a6a]">{submissions.length}</span>
          </div>

          {submissions.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#5a7a6a]">
              You have not submitted any work yet.
            </div>
          ) : (
            <motion.ul
              className="divide-y divide-[#E5EDE9]"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {submissions.map(s => (
                <motion.li key={s.id} variants={itemVariants} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    {s.file_url ? (
                      <img
                        src={s.file_url}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover bg-[#F8FAF9] shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#F8FAF9] flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-[#5a7a6a]/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[#1a2e25] truncate">{s.assignmentTitle}</p>
                        {s.assignmentCategory && (
                          <span className="text-[10px] font-semibold text-[#5a7a6a] bg-[#F8FAF9] border border-[#E5EDE9] px-2 py-0.5 rounded-full">
                            {s.assignmentCategory}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#5a7a6a]/80 mt-0.5">Submitted {fmt(s.submitted_at)}</p>

                      <div className="flex items-center gap-2 mt-2">
                        {s.grade !== null && s.grade !== '' ? (
                          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#337357]/10 text-[#337357]">
                            Grade {s.grade}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Awaiting grade
                          </span>
                        )}
                      </div>

                      {s.feedback && (
                        <div className="mt-2.5 bg-[#FFDBE5]/30 border border-[#FFDBE5] rounded-lg px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#E27396] mb-0.5">Teacher feedback</p>
                          <p className="text-xs text-[#1a2e25] leading-relaxed">{s.feedback}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </section>
      </div>
    </motion.div>
  )
}
