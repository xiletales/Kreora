'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Users, ClipboardList, FileText, TrendingUp } from 'lucide-react'
import PageTransition from '@/components/PageTransition'

interface Student {
  id: string
  nisn: string
  name: string
  grade: string
  class: string
}

interface StudentRow extends Student {
  submitted: number
  lastActive: string | null
  avgGrade: number | null
}

interface Assignment {
  id: string
  title: string
}

interface Submission {
  nisn: string
  submitted_at: string
  grade: string | null
  assignment_id: string
}

const GRADE_POINTS: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 }

export default function MonitoringPage() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [studentCount, setStudentCount] = useState(0)
  const [rows, setRows] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return

    const [{ data: students }, { data: asgs }] = await Promise.all([
      supabase.from('students').select('id, nisn, name, grade, class').eq('added_by', user.id),
      supabase.from('assignments').select('id, title').eq('teacher_id', user.id),
    ])

    const studentList: Student[] = students ?? []
    const assignmentList: Assignment[] = asgs ?? []
    const assignmentIds = assignmentList.map(a => a.id)

    setStudentCount(studentList.length)
    setAssignments(assignmentList)

    if (studentList.length === 0) { setLoading(false); return }

    const nisns = studentList.map(s => s.nisn)
    let subs: Submission[] = []

    if (assignmentIds.length > 0) {
      const { data } = await supabase
        .from('submissions')
        .select('nisn, submitted_at, grade, assignment_id')
        .in('nisn', nisns)
        .in('assignment_id', assignmentIds)
      subs = data ?? []
    }

    setSubmissions(subs)

    const subsByNisn: Record<string, Submission[]> = {}
    subs.forEach(s => {
      if (!subsByNisn[s.nisn]) subsByNisn[s.nisn] = []
      subsByNisn[s.nisn].push(s)
    })

    const studentRows: StudentRow[] = studentList.map(st => {
      const mySubs = subsByNisn[st.nisn] ?? []
      const latestSub = [...mySubs].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0]
      const points = mySubs
        .map(s => (s.grade ? GRADE_POINTS[s.grade] : null))
        .filter((p): p is number => typeof p === 'number')
      const avgGrade = points.length > 0
        ? Math.round((points.reduce((a, b) => a + b, 0) / points.length) * 10) / 10
        : null
      return {
        ...st,
        submitted:  mySubs.length,
        lastActive: latestSub?.submitted_at ?? null,
        avgGrade,
      }
    })

    setRows(studentRows.sort((a, b) => b.submitted - a.submitted))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const totalSubmissions = submissions.length
  const totalPossible    = studentCount * assignments.length
  const submissionRate   = totalPossible > 0
    ? Math.round((totalSubmissions / totalPossible) * 100)
    : 0

  const chartData = useMemo(() => {
    return assignments.map(a => {
      const count = submissions.filter(s => s.assignment_id === a.id).length
      return { id: a.id, title: a.title, count }
    })
  }, [assignments, submissions])

  const maxCount = Math.max(1, ...chartData.map(d => d.count))

  const STAT_CARDS = [
    { label: 'Total Students',     value: studentCount,                icon: Users,         color: 'text-[#337357]', bg: 'bg-[#337357]/10' },
    { label: 'Total Assignments',  value: assignments.length,          icon: ClipboardList, color: 'text-blue-600',  bg: 'bg-blue-50'      },
    { label: 'Total Submissions',  value: totalSubmissions,            icon: FileText,      color: 'text-amber-600', bg: 'bg-amber-50'     },
    { label: 'Submission Rate',    value: `${submissionRate}%`,        icon: TrendingUp,    color: 'text-[#E27396]', bg: 'bg-[#FFDBE5]/50' },
  ]

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function gradeLabel(avg: number | null) {
    if (avg === null) return '—'
    return avg.toFixed(1)
  }

  function truncate(s: string, n: number) {
    return s.length > n ? s.slice(0, n - 1) + '…' : s
  }

  return (
    <PageTransition className="p-6 w-full">
      <div className="mb-8 pl-4 border-l-4 border-[#337357]">
        <h1 className="text-2xl font-bold text-[#1a2e25]">Monitoring</h1>
        <p className="text-sm text-[#5a7a6a] mt-0.5">Track student activity and submission progress</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-[#E5EDE9] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            <p className="text-2xl font-bold text-[#1a2e25]">{value}</p>
            <p className="text-xs text-[#5a7a6a] mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Bar chart: Submission Activity by Assignment ── */}
      {assignments.length > 0 && (
        <div className="bg-white border border-[#E5EDE9] rounded-xl shadow-sm p-5 mb-8">
          <h2 className="font-semibold text-[#1a2e25] text-sm mb-1">Submission Activity by Assignment</h2>
          <p className="text-xs text-[#5a7a6a] mb-5">How many students have submitted each assignment</p>

          <div className="flex items-end gap-3 h-56 pl-10 relative">
            {/* Y-axis label */}
            <span className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-semibold uppercase tracking-wide text-[#5a7a6a]">
              Submissions
            </span>

            {/* Y-axis tick: max */}
            <span className="absolute left-6 top-0 text-[10px] text-[#5a7a6a]">{maxCount}</span>
            <span className="absolute left-6 bottom-7 text-[10px] text-[#5a7a6a]">0</span>

            {chartData.map(d => {
              const heightPct = (d.count / maxCount) * 100
              const isEmpty = d.count === 0
              return (
                <div key={d.id} className="flex-1 flex flex-col items-center min-w-0">
                  <div className="w-full flex-1 flex items-end relative">
                    <div
                      className="w-full rounded-t-md transition-all relative group"
                      style={{
                        height: isEmpty ? '4px' : `${heightPct}%`,
                        backgroundColor: isEmpty ? '#FFDBE5' : '#337357',
                        minHeight: '4px',
                      }}
                      title={`${d.title}: ${d.count} submission${d.count !== 1 ? 's' : ''}`}
                    >
                      {!isEmpty && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#337357]">
                          {d.count}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-[#5a7a6a] font-medium mt-2 text-center w-full truncate" title={d.title}>
                    {truncate(d.title, 15)}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#E5EDE9]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#337357' }} />
              <span className="text-[11px] text-[#5a7a6a]">Submitted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#FFDBE5' }} />
              <span className="text-[11px] text-[#5a7a6a]">No submissions</span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-[#E5EDE9] rounded-xl shadow-sm overflow-hidden animate-pulse">
          <div className="h-10 bg-[#F8FAF9] border-b border-[#E5EDE9]" />
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 border-b border-[#E5EDE9]" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-[#E5EDE9] rounded-xl shadow-sm p-8 text-center">
          <p className="font-semibold text-[#1a2e25]">No students yet.</p>
          <p className="text-sm text-[#5a7a6a] mt-1">Add students from the Add Students page.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E5EDE9] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E5EDE9] bg-[#F8FAF9]">
            <h2 className="font-semibold text-[#1a2e25] text-sm">Student Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5EDE9] text-xs text-[#5a7a6a] font-semibold uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">NISN</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Grade</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Class</th>
                  <th className="text-left px-4 py-3">Submitted</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Avg Grade</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EDE9]">
                {rows.map(st => (
                  <tr key={st.nisn} className="hover:bg-[#F8FAF9] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
                        >
                          {st.name[0]?.toUpperCase() ?? '?'}
                        </div>
                        <span className="font-medium text-[#1a2e25]">{st.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-[#5a7a6a]">{st.nisn}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-[#5a7a6a]">{st.grade}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-[#5a7a6a]">{st.class}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        st.submitted > 0
                          ? 'bg-[#337357]/10 text-[#337357]'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {st.submitted}/{assignments.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-[#5a7a6a] text-xs font-medium">
                      {gradeLabel(st.avgGrade)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-[#5a7a6a] text-xs">
                      {st.lastActive ? fmtDate(st.lastActive) : 'No activity'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageTransition>
  )
}
