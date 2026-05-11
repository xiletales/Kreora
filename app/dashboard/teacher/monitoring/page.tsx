'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Users, ClipboardList, FileText, TrendingUp } from 'lucide-react'
import PageTransition from '@/components/PageTransition'
import ClassFilterTabs, { ALL_CLASSES } from '@/components/ClassFilterTabs'
import Pagination from '@/components/Pagination'
import SearchInput from '@/components/SearchInput'

const PAGE_SIZE = 15

interface Student {
  id: string
  nisn: string
  name: string
  grade: string
  class: string
}

interface StudentRow extends Student {
  submitted: number
  graded: number
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
  const [rows, setRows] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeClass, setActiveClass] = useState(ALL_CLASSES)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [activeClass, search])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [{ data: studentsData }, { data: asgs }] = await Promise.all([
      supabase.from('students').select('id, nisn, name, grade, class').eq('added_by', user.id),
      supabase.from('assignments').select('id, title').eq('teacher_id', user.id),
    ])

    const directStudents: Student[] = studentsData ?? []
    const assignmentList: Assignment[] = asgs ?? []
    const assignmentIds = assignmentList.map(a => a.id)

    setAssignments(assignmentList)

    let subs: Submission[] = []
    if (assignmentIds.length > 0) {
      const { data } = await supabase
        .from('submissions')
        .select('nisn, submitted_at, grade, assignment_id')
        .in('assignment_id', assignmentIds)
      subs = data ?? []
    }
    setSubmissions(subs)

    // Build the student set: union of teacher's students + nisns that appear in submissions.
    // This guards against the students table being unavailable / partially blocked by RLS.
    const studentMap = new Map<string, Student>()
    directStudents.forEach(s => studentMap.set(s.nisn, s))

    const submissionNisns = Array.from(new Set(subs.map(s => s.nisn)))
    const missingNisns = submissionNisns.filter(n => !studentMap.has(n))

    if (missingNisns.length > 0) {
      // Fetch profile data for orphan nisns directly (no added_by filter so RLS isn't a factor here)
      const { data: extra } = await supabase
        .from('students')
        .select('id, nisn, name, grade, class')
        .in('nisn', missingNisns)
      ;(extra ?? []).forEach(s => studentMap.set(s.nisn, s as Student))

      // Whatever remains has no profile — render with placeholder name so monitoring isn't blank
      missingNisns
        .filter(n => !studentMap.has(n))
        .forEach(n => studentMap.set(n, { id: n, nisn: n, name: `Student ${n}`, grade: '', class: '' }))
    }

    const allStudents = Array.from(studentMap.values())

    const subsByNisn: Record<string, Submission[]> = {}
    subs.forEach(s => {
      if (!subsByNisn[s.nisn]) subsByNisn[s.nisn] = []
      subsByNisn[s.nisn].push(s)
    })

    const studentRows: StudentRow[] = allStudents.map(st => {
      const mySubs = subsByNisn[st.nisn] ?? []
      const latestSub = [...mySubs].sort(
        (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
      )[0]
      const points = mySubs
        .map(s => (s.grade ? GRADE_POINTS[s.grade] : null))
        .filter((p): p is number => typeof p === 'number')
      const avgGrade = points.length > 0
        ? Math.round((points.reduce((a, b) => a + b, 0) / points.length) * 10) / 10
        : null
      return {
        ...st,
        submitted:  mySubs.length,
        graded:     points.length,
        lastActive: latestSub?.submitted_at ?? null,
        avgGrade,
      }
    })

    setRows(studentRows.sort((a, b) => b.submitted - a.submitted))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const classList = useMemo(() => {
    const set = new Set<string>()
    rows.forEach(r => {
      const label = [r.grade, r.class].filter(Boolean).join(' ').trim()
      if (label) set.add(label)
    })
    return Array.from(set).sort()
  }, [rows])

  const visibleRows = useMemo(() => {
    let arr = rows
    if (activeClass !== ALL_CLASSES) {
      arr = arr.filter(r => [r.grade, r.class].filter(Boolean).join(' ').trim() === activeClass)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      arr = arr.filter(r =>
        r.name.toLowerCase().includes(q) || r.nisn.toLowerCase().includes(q),
      )
    }
    return arr
  }, [rows, activeClass, search])

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE))
  const pagedRows = useMemo(
    () => visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visibleRows, page],
  )

  const visibleNisns = useMemo(() => new Set(visibleRows.map(r => r.nisn)), [visibleRows])

  const filteredSubmissions = useMemo(
    () => activeClass === ALL_CLASSES ? submissions : submissions.filter(s => visibleNisns.has(s.nisn)),
    [submissions, activeClass, visibleNisns],
  )

  const totalSubmissions = filteredSubmissions.length
  const totalPossible    = visibleRows.length * assignments.length
  const submissionRate   = totalPossible > 0
    ? Math.round((totalSubmissions / totalPossible) * 100)
    : 0

  const chartData = useMemo(() => {
    return assignments.map(a => {
      const count = filteredSubmissions.filter(s => s.assignment_id === a.id).length
      return { id: a.id, title: a.title, count }
    })
  }, [assignments, filteredSubmissions])

  const maxCount = Math.max(1, ...chartData.map(d => d.count))

  const STAT_CARDS = [
    { label: 'Total Students',     value: visibleRows.length,           icon: Users,         color: 'text-brand-green-dark', bg: 'bg-brand-green' },
    { label: 'Total Assignments',  value: assignments.length,           icon: ClipboardList, color: 'text-blue-600',  bg: 'bg-blue-50'      },
    { label: 'Total Submissions',  value: totalSubmissions,             icon: FileText,      color: 'text-amber-600', bg: 'bg-amber-50'     },
    { label: 'Submission Rate',    value: `${submissionRate}%`,         icon: TrendingUp,    color: 'text-brand-pink-dark', bg: 'bg-brand-pink/50' },
  ]

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function avgLetter(avg: number | null) {
    if (avg === null) return '—'
    if (avg >= 3.5) return `A (${avg.toFixed(1)})`
    if (avg >= 2.5) return `B (${avg.toFixed(1)})`
    if (avg >= 1.5) return `C (${avg.toFixed(1)})`
    return `D (${avg.toFixed(1)})`
  }

  function truncate(s: string, n: number) {
    return s.length > n ? s.slice(0, n - 1) + '…' : s
  }

  return (
    <PageTransition className="p-6 w-full">
      <div className="mb-8 pl-4 border-l-4 border-brand-green-dark">
        <h1 className="text-2xl font-bold text-gray-800">Monitoring</h1>
        <p className="text-sm text-gray-600 mt-0.5">Track student activity and submission progress</p>
      </div>

      {!loading && rows.length > 0 && (
        <div className="space-y-3 mb-5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by student name or NISN…"
            className="max-w-sm"
          />
          <ClassFilterTabs
            classes={classList}
            selected={activeClass}
            onChange={setActiveClass}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-brand-green-dark rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-600 mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Bar chart: Submission Activity by Assignment ── */}
      {assignments.length > 0 && (
        <div className="bg-white border border-brand-green-dark rounded-xl shadow-sm p-5 mb-8">
          <h2 className="font-semibold text-gray-800 text-sm mb-1">Submission Activity by Assignment</h2>
          <p className="text-xs text-gray-600 mb-5">How many students have submitted each assignment</p>

          <div className="flex items-end gap-3 h-56 pl-10 relative">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
              Submissions
            </span>
            <span className="absolute left-6 top-0 text-[10px] text-gray-600">{maxCount}</span>
            <span className="absolute left-6 bottom-7 text-[10px] text-gray-600">0</span>

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
                        backgroundColor: isEmpty ? '#F9D5E5' : '#A8D5B5',
                        minHeight: '4px',
                      }}
                      title={`${d.title}: ${d.count} submission${d.count !== 1 ? 's' : ''}`}
                    >
                      {!isEmpty && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-brand-green-dark">
                          {d.count}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 font-medium mt-2 text-center w-full truncate" title={d.title}>
                    {truncate(d.title, 15)}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-brand-green-dark">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#A8D5B5' }} />
              <span className="text-[11px] text-gray-600">Submitted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#F9D5E5' }} />
              <span className="text-[11px] text-gray-600">No submissions</span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-brand-green-dark rounded-xl shadow-sm overflow-hidden animate-pulse">
          <div className="h-10 bg-brand-off-white border-b border-brand-green-dark" />
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 border-b border-brand-green-dark" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-brand-green-dark rounded-xl shadow-sm p-8 text-center">
          <p className="font-semibold text-gray-800">No student activity yet.</p>
          <p className="text-sm text-gray-600 mt-1">
            Add students from the Add Students page or wait for submissions to come in.
          </p>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="bg-white border border-brand-green-dark rounded-xl shadow-sm p-8 text-center">
          <p className="text-sm text-gray-600">No students in {activeClass}.</p>
        </div>
      ) : (
        <div className="bg-white border border-brand-green-dark rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-brand-green-dark bg-brand-off-white">
            <h2 className="font-semibold text-gray-800 text-sm">Student Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-green-dark text-xs text-gray-600 font-semibold uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">NISN</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Class</th>
                  <th className="text-left px-4 py-3">Submitted</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Graded</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Avg Grade</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-green">
                {pagedRows.map(st => (
                  <tr key={st.nisn} className="hover:bg-brand-off-white transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-brand-pink-dark text-xs font-bold shrink-0"
                          style={{ background: 'linear-gradient(135deg, #F9D5E5, #F0A8C4)' }}
                        >
                          {st.name[0]?.toUpperCase() ?? '?'}
                        </div>
                        <span className="font-medium text-gray-800">{st.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600">{st.nisn}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                      {st.grade && st.class ? `${st.grade} ${st.class}` : st.class || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        st.submitted > 0
                          ? 'bg-brand-green text-brand-green-dark'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {st.submitted}/{assignments.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600 text-xs font-medium">
                      {st.graded}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600 text-xs font-medium">
                      {avgLetter(st.avgGrade)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600 text-xs">
                      {st.lastActive ? fmtDate(st.lastActive) : 'No activity'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && visibleRows.length > 0 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </PageTransition>
  )
}
