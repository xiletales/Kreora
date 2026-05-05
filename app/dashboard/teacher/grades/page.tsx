'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Star, Download, Loader2, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '@/components/PageTransition'

interface AssignmentRow {
  id: string
  title: string
  category: string
  deadline: string
}

interface StudentRow {
  nisn: string
  name: string
  class: string
  grade: string
}

interface SubmissionRow {
  id: string
  nisn: string
  assignment_id: string
  fileUrl: string | null
  submittedAt: string
  grade: string
  feedback: string
}

const GRADE_OPTIONS = ['', 'A', 'B', 'C', 'D'] as const
const DEADLINE_FILTERS = ['all', 'This Week', 'This Month', 'Overdue'] as const
type DeadlineFilter = typeof DEADLINE_FILTERS[number]

function gradeColor(grade: string) {
  switch (grade) {
    case 'A': return 'bg-emerald-50 border-emerald-300 text-emerald-700'
    case 'B': return 'bg-blue-50 border-blue-300 text-blue-700'
    case 'C': return 'bg-amber-50 border-amber-300 text-amber-700'
    case 'D': return 'bg-rose-50 border-rose-300 text-rose-700'
    default:  return 'bg-white border-[#EA9AB2]/40 text-[#1a2e25]'
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function inDeadlineRange(deadline: string, filter: DeadlineFilter): boolean {
  if (filter === 'all') return true
  const t   = new Date(deadline).getTime()
  const now = Date.now()
  if (filter === 'This Week')  return t >= now && t <= now + 7  * 86_400_000
  if (filter === 'This Month') return t >= now && t <= now + 30 * 86_400_000
  if (filter === 'Overdue')    return t < now
  return true
}

const filterSelectCls =
  'text-xs font-medium text-[#1a2e25] bg-white border border-[#EA9AB2]/50 rounded-lg px-3 py-1.5 outline-none focus:border-[#E27396] transition-colors'

export default function GradesPage() {
  const { user } = useAuth()

  const [students, setStudents]             = useState<StudentRow[]>([])
  const [assignments, setAssignments]       = useState<AssignmentRow[]>([])
  const [allSubmissions, setAllSubmissions] = useState<SubmissionRow[]>([])
  const [loading, setLoading]               = useState(true)

  const [filterClass, setFilterClass]             = useState('all')
  const [filterDeadline, setFilterDeadline]       = useState<DeadlineFilter>('all')
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null)

  const [inputs, setInputs] = useState<Record<string, { grade: string; feedback: string }>>({})
  const [saving, setSaving] = useState<Set<string>>(new Set())

  const loadAll = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)

    const [studentsRes, assignmentsRes] = await Promise.all([
      supabase.from('students').select('nisn, name, class, grade').eq('added_by', user.id),
      supabase.from('assignments').select('id, title, category, deadline').eq('teacher_id', user.id).order('created_at', { ascending: false }),
    ])

    if (studentsRes.error || assignmentsRes.error) {
      toast.error('Failed to load grading data.')
      setLoading(false)
      return
    }

    const studentList    = (studentsRes.data ?? []) as StudentRow[]
    const assignmentList = (assignmentsRes.data ?? []) as AssignmentRow[]
    setStudents(studentList)
    setAssignments(assignmentList)

    const assignmentIds = assignmentList.map(a => a.id)
    let subs: SubmissionRow[] = []

    if (assignmentIds.length > 0) {
      const { data, error } = await supabase
        .from('submissions')
        .select('id, nisn, assignment_id, file_url, submitted_at, grade, feedback')
        .in('assignment_id', assignmentIds)
        .order('submitted_at', { ascending: false })

      if (error) {
        toast.error('Failed to load submissions.')
        setLoading(false)
        return
      }

      subs = (data ?? []).map(s => ({
        id:           s.id,
        nisn:         s.nisn,
        assignment_id: s.assignment_id,
        fileUrl:      s.file_url,
        submittedAt:  s.submitted_at,
        grade:        s.grade ?? '',
        feedback:     s.feedback ?? '',
      }))
    }

    setAllSubmissions(subs)
    const initInputs: Record<string, { grade: string; feedback: string }> = {}
    subs.forEach(s => { initInputs[s.id] = { grade: s.grade, feedback: s.feedback } })
    setInputs(initInputs)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { loadAll() }, [loadAll])

  // Unique classes derived from real student data
  const classOptions = useMemo(() => {
    const set = new Set<string>()
    students.forEach(s => { if (s.class) set.add(s.class) })
    return Array.from(set).sort()
  }, [students])

  // NISNs of students that fall under the selected class
  const classNisns = useMemo(() => {
    if (filterClass === 'all') return new Set(students.map(s => s.nisn))
    return new Set(students.filter(s => s.class === filterClass).map(s => s.nisn))
  }, [students, filterClass])

  // Assignments that have at least one submission from a student in the selected class
  const assignmentsAfterClassFilter = useMemo(() => {
    if (filterClass === 'all') return assignments
    const ids = new Set<string>()
    allSubmissions.forEach(s => {
      if (classNisns.has(s.nisn)) ids.add(s.assignment_id)
    })
    return assignments.filter(a => ids.has(a.id))
  }, [assignments, allSubmissions, classNisns, filterClass])

  // Then narrow by deadline filter
  const visibleAssignments = useMemo(
    () => assignmentsAfterClassFilter.filter(a => inDeadlineRange(a.deadline, filterDeadline)),
    [assignmentsAfterClassFilter, filterDeadline]
  )

  // Auto-reset selectedAssignment if it falls out of the visible set
  useEffect(() => {
    if (selectedAssignment && !visibleAssignments.find(a => a.id === selectedAssignment)) {
      setSelectedAssignment(null)
    }
  }, [visibleAssignments, selectedAssignment])

  // Submissions to render = those for selectedAssignment, scoped to selected class
  const visibleSubmissions = useMemo(() => {
    if (!selectedAssignment) return []
    return allSubmissions
      .filter(s => s.assignment_id === selectedAssignment && classNisns.has(s.nisn))
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
  }, [allSubmissions, selectedAssignment, classNisns])

  const studentByNisn = useMemo(
    () => Object.fromEntries(students.map(s => [s.nisn, s])),
    [students]
  )

  async function saveRow(id: string) {
    const draft = inputs[id]
    if (!draft) return

    setSaving(prev => new Set(prev).add(id))
    const { error } = await supabase
      .from('submissions')
      .update({
        grade:    draft.grade || null,
        feedback: draft.feedback.trim() || null,
      })
      .eq('id', id)
    setSaving(prev => { const n = new Set(prev); n.delete(id); return n })

    if (error) {
      console.error('[GradesPage] save error:', error)
      toast.error('Failed to save: ' + (error.message || 'unknown error'))
      return
    }

    setAllSubmissions(prev => prev.map(r =>
      r.id === id ? { ...r, grade: draft.grade, feedback: draft.feedback } : r
    ))
    toast.success('Saved.')
  }

  const activeAssignment = visibleAssignments.find(a => a.id === selectedAssignment) ?? null

  return (
    <PageTransition className="p-6 w-full">
      <div className="mb-8 pl-4 border-l-4 border-[#337357]">
        <h1 className="text-2xl font-bold text-[#1a2e25]">Grades</h1>
        <p className="text-sm text-[#5a7a6a] mt-0.5">Pick a class, narrow by deadline, then grade each submission.</p>
      </div>

      {loading ? (
        <div className="flex gap-2 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-9 w-32 bg-[#F8FAF9] rounded-full animate-pulse" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-24 bg-white border border-[#E5EDE9] rounded-xl shadow-sm">
          <div className="w-12 h-12 bg-[#F8FAF9] rounded-xl flex items-center justify-center mx-auto mb-3">
            <ClipboardList size={20} className="text-[#5a7a6a]" />
          </div>
          <p className="font-semibold text-[#1a2e25]">No assignments yet</p>
          <p className="text-sm text-[#5a7a6a] mt-1">Create an assignment first to start grading.</p>
        </div>
      ) : (
        <>
          {/* Cascading filters */}
          <div className="flex flex-wrap items-center gap-3 mb-5 px-1">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#5a7a6a] font-medium">Class</label>
              <select
                className={filterSelectCls}
                value={filterClass}
                onChange={e => { setFilterClass(e.target.value); setSelectedAssignment(null) }}
              >
                <option value="all">All classes</option>
                {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-[#5a7a6a] font-medium">Deadline</label>
              <select
                className={filterSelectCls}
                value={filterDeadline}
                onChange={e => { setFilterDeadline(e.target.value as DeadlineFilter); setSelectedAssignment(null) }}
              >
                {DEADLINE_FILTERS.map(d => (
                  <option key={d} value={d}>{d === 'all' ? 'All deadlines' : d}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-[#5a7a6a] font-medium">Assignment</label>
              <select
                className={filterSelectCls}
                value={selectedAssignment ?? ''}
                onChange={e => setSelectedAssignment(e.target.value || null)}
                disabled={visibleAssignments.length === 0}
              >
                <option value="">— Select an assignment —</option>
                {visibleAssignments.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* No assignment selected yet */}
          {!selectedAssignment ? (
            <div className="text-center py-16 bg-white border border-[#EA9AB2]/30 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-[#FFDBE5]/50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Star size={20} className="text-[#E27396]" />
              </div>
              <p className="font-semibold text-[#1a2e25]">
                {visibleAssignments.length === 0
                  ? 'No assignments match the current filters'
                  : 'Pick an assignment to start grading'}
              </p>
              <p className="text-sm text-[#5a7a6a] mt-1">
                {visibleAssignments.length === 0
                  ? 'Try a different class or deadline filter.'
                  : `${visibleAssignments.length} assignment${visibleAssignments.length !== 1 ? 's' : ''} available in this view.`}
              </p>
            </div>
          ) : (
            <>
              {/* Submission count */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[#5a7a6a]">
                  {visibleSubmissions.length} student{visibleSubmissions.length !== 1 ? 's' : ''} submitted
                  {activeAssignment ? ` for "${activeAssignment.title}"` : ''}
                  {filterClass !== 'all' ? ` (Class ${filterClass})` : ''}
                </p>
                {activeAssignment && (
                  <span className="text-[10px] font-semibold text-[#5a7a6a] bg-[#F8FAF9] border border-[#E5EDE9] px-2 py-0.5 rounded-full">
                    Due {fmtDate(activeAssignment.deadline)}
                  </span>
                )}
              </div>

              {/* Submissions list */}
              {visibleSubmissions.length === 0 ? (
                <div className="text-center py-16 bg-white border border-[#EA9AB2]/30 rounded-xl shadow-sm">
                  <div className="w-12 h-12 bg-[#FFDBE5]/50 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Star size={20} className="text-[#E27396]" />
                  </div>
                  <p className="font-semibold text-[#1a2e25]">No submissions yet for this assignment</p>
                  <p className="text-sm text-[#5a7a6a] mt-1">Submissions will appear here once students upload work.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleSubmissions.map(row => {
                    const draft = inputs[row.id] ?? { grade: row.grade, feedback: row.feedback }
                    const isSaving = saving.has(row.id)
                    const dirty = draft.grade !== row.grade || draft.feedback !== row.feedback
                    const stu = studentByNisn[row.nisn]
                    return (
                      <div
                        key={row.id}
                        className="bg-white border border-[#EA9AB2]/30 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Thumbnail */}
                          <div className="shrink-0">
                            {row.fileUrl ? (
                              <a
                                href={row.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-[#FFDBE5]/40 border border-[#EA9AB2]/30 relative group"
                              >
                                <img
                                  src={row.fileUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                                />
                                <div className="absolute inset-0 bg-[#1a2e25]/0 group-hover:bg-[#1a2e25]/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <Download size={14} className="text-white" />
                                </div>
                              </a>
                            ) : (
                              <div className="w-full sm:w-24 h-24 rounded-lg bg-[#FFDBE5]/40 border border-[#EA9AB2]/30 flex items-center justify-center">
                                <Star size={16} className="text-[#E27396]" />
                              </div>
                            )}
                          </div>

                          {/* Main content */}
                          <div className="flex-1 min-w-0 flex flex-col gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#1a2e25]">
                                {stu?.name ?? `NISN ${row.nisn}`}
                              </span>
                              <span className="text-[10px] font-semibold text-[#5a7a6a] bg-[#F8FAF9] border border-[#E5EDE9] px-2 py-0.5 rounded-full">
                                NISN {row.nisn}
                              </span>
                              {stu?.class && (
                                <span className="text-[10px] font-semibold text-[#5a7a6a] bg-[#F8FAF9] border border-[#E5EDE9] px-2 py-0.5 rounded-full">
                                  Class {stu.class}
                                </span>
                              )}
                              <span className="text-[10px] text-[#5a7a6a] bg-[#F8FAF9] border border-[#E5EDE9] px-2 py-0.5 rounded-full">
                                Submitted {fmtDate(row.submittedAt)}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_auto] gap-3 items-start">
                              {/* Grade dropdown */}
                              <div>
                                <label className="text-[10px] font-medium text-[#5a7a6a] uppercase tracking-wide mb-1 block">
                                  Grade
                                </label>
                                <select
                                  value={draft.grade}
                                  onChange={e => setInputs(prev => ({
                                    ...prev,
                                    [row.id]: { ...draft, grade: e.target.value },
                                  }))}
                                  className={`w-full text-sm font-semibold border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#E27396]/30 transition-colors ${gradeColor(draft.grade)}`}
                                >
                                  {GRADE_OPTIONS.map(g => (
                                    <option key={g || 'none'} value={g}>{g || '—'}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Feedback textarea */}
                              <div>
                                <label className="text-[10px] font-medium text-[#5a7a6a] uppercase tracking-wide mb-1 block">
                                  Feedback
                                </label>
                                <textarea
                                  rows={2}
                                  value={draft.feedback}
                                  onChange={e => setInputs(prev => ({
                                    ...prev,
                                    [row.id]: { ...draft, feedback: e.target.value },
                                  }))}
                                  placeholder="Short feedback for the student..."
                                  className="w-full text-sm bg-[#FFDBE5]/20 border border-[#EA9AB2]/40 rounded-lg px-3 py-2 outline-none focus:bg-white focus:border-[#E27396] transition-colors resize-none placeholder-[#5a7a6a]/50 text-[#1a2e25]"
                                />
                              </div>

                              {/* Save button */}
                              <div className="md:pt-5">
                                <button
                                  onClick={() => saveRow(row.id)}
                                  disabled={isSaving || !dirty}
                                  className="flex items-center gap-1.5 text-xs font-semibold bg-[#337357] text-white px-4 py-2 rounded-lg hover:bg-[#285e46] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : null}
                                  {isSaving ? 'Saving' : 'Save'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </PageTransition>
  )
}
