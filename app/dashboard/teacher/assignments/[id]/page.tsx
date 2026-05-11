'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
  ArrowLeft, Pencil, X, Loader2, Calendar, Tag, GraduationCap,
  CheckCircle, Clock, AlertCircle, Download,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '@/components/PageTransition'
import SearchInput from '@/components/SearchInput'


const CATEGORIES = ['Illustration', 'Poster', 'Logo', 'Digital', 'Painting', 'Animation']
const STATUS_FILTERS = ['All', 'Submitted', 'Not Submitted', 'Overdue'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

interface Assignment {
  id: string
  teacher_id: string
  title: string
  category: string
  class: string | null
  deadline: string
  description: string | null
  created_at: string
}

interface Student {
  nisn: string
  name: string
  grade: string | null
  class: string | null
}

interface Submission {
  id: string
  nisn: string
  file_url: string | null
  grade: string | null
  submitted_at: string
}

interface RowItem {
  nisn: string
  name: string
  classLabel: string
  submission: Submission | null
  status: 'submitted' | 'not-submitted' | 'overdue'
}

const GRADE_COLOR: Record<string, string> = {
  A: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  B: 'bg-blue-50 text-blue-700 border-blue-200',
  C: 'bg-amber-50 text-amber-700 border-amber-200',
  D: 'bg-rose-50 text-rose-700 border-rose-200',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [search, setSearch] = useState('')

  // Edit state
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'Illustration', class: '', deadline: '', description: '' })
  const [teacherClasses, setTeacherClasses] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id || !id) return
    setLoading(true)

    const { data: a, error } = await supabase
      .from('assignments')
      .select('id, teacher_id, title, category, class, deadline, description, created_at')
      .eq('id', id)
      .eq('teacher_id', user.id)
      .maybeSingle()

    if (error || !a) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setAssignment(a as Assignment)

    const [{ data: studs }, { data: subs }] = await Promise.all([
      supabase.from('students').select('nisn, name, grade, class').eq('added_by', user.id),
      supabase.from('submissions').select('id, nisn, file_url, grade, submitted_at').eq('assignment_id', id),
    ])
    setStudents(studs ?? [])
    setSubmissions(subs ?? [])
    setLoading(false)
  }, [user?.id, id])

  useEffect(() => { load() }, [load])

  // Auto-open edit form when ?edit=1 and assignment loaded
  useEffect(() => {
    if (assignment && searchParams.get('edit') === '1' && !editing) {
      openEdit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment, searchParams])

  const loadTeacherClasses = useCallback(async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('students')
      .select('grade, class')
      .eq('added_by', user.id)
    const set = new Set<string>()
    ;(data ?? []).forEach(s => {
      const label = [s.grade, s.class].filter(Boolean).join(' ').trim()
      if (label) set.add(label)
    })
    setTeacherClasses(Array.from(set).sort())
  }, [user?.id])

  function openEdit() {
    if (!assignment) return
    setForm({
      title:       assignment.title,
      category:    assignment.category || 'Illustration',
      class:       assignment.class ?? '',
      deadline:    assignment.deadline.slice(0, 10),
      description: assignment.description ?? '',
    })
    loadTeacherClasses()
    setEditing(true)
  }

  async function handleSave() {
    if (!assignment || !user?.id) return
    if (!form.title.trim()) { toast.error('Title is required.'); return }
    if (!form.deadline)     { toast.error('Deadline is required.'); return }
    if (!form.class)        { toast.error('Class is required.'); return }
    if (new Date(form.deadline).getTime() < new Date(new Date().toISOString().slice(0, 10)).getTime()) {
      toast.error('Deadline cannot be in the past.')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('assignments')
      .update({
        title:       form.title.trim(),
        category:    form.category,
        class:       form.class,
        deadline:    form.deadline,
        description: form.description.trim() || null,
      })
      .eq('id', assignment.id)
      .eq('teacher_id', user.id)
    setSaving(false)

    if (error) { toast.error('Failed to save: ' + error.message); return }
    toast.success('Assignment updated')
    setEditing(false)
    await load()
  }

  // Build the unified row list
  const rows: RowItem[] = useMemo(() => {
    if (!assignment) return []
    const subByNisn = new Map(submissions.map(s => [s.nisn, s]))
    const past = new Date(assignment.deadline).getTime() < Date.now()

    // Show all teacher's students; if assignment is class-scoped, narrow to that class.
    const scope = assignment.class
      ? students.filter(s => [s.grade, s.class].filter(Boolean).join(' ').trim() === assignment.class)
      : students

    return scope.map(s => {
      const sub = subByNisn.get(s.nisn) ?? null
      const status: RowItem['status'] = sub
        ? 'submitted'
        : past
          ? 'overdue'
          : 'not-submitted'
      return {
        nisn: s.nisn,
        name: s.name,
        classLabel: [s.grade, s.class].filter(Boolean).join(' ').trim(),
        submission: sub,
        status,
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [assignment, students, submissions])

  const filteredRows = useMemo(() => {
    let arr = rows
    if (statusFilter === 'Submitted')     arr = arr.filter(r => r.status === 'submitted')
    if (statusFilter === 'Not Submitted') arr = arr.filter(r => r.status === 'not-submitted')
    if (statusFilter === 'Overdue')       arr = arr.filter(r => r.status === 'overdue')
    const q = search.trim().toLowerCase()
    if (q) {
      arr = arr.filter(r => r.name.toLowerCase().includes(q) || r.nisn.toLowerCase().includes(q))
    }
    return arr
  }, [rows, statusFilter, search])

  const submittedCount = rows.filter(r => r.status === 'submitted').length
  const gradedCount    = rows.filter(r => r.submission?.grade).length

  if (loading) {
    return (
      <PageTransition className="p-6 w-full">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={22} className="animate-spin text-brand-green-dark" />
        </div>
      </PageTransition>
    )
  }

  if (notFound || !assignment) {
    return (
      <PageTransition className="p-6 w-full">
        <div className="bg-white border border-brand-green-dark rounded-xl p-8 text-center max-w-lg mx-auto">
          <p className="font-semibold text-gray-800">Assignment not found.</p>
          <p className="text-sm text-gray-600 mt-1">It may have been deleted or you don&apos;t have access.</p>
          <Link href="/dashboard/teacher/assignments" className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-brand-pink-dark hover:underline">
            <ArrowLeft size={14} /> Back to Assignments
          </Link>
        </div>
      </PageTransition>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const past = new Date(assignment.deadline).getTime() < Date.now()

  return (
    <PageTransition className="p-6 w-full max-w-screen-xl mx-auto">

      <Link href="/dashboard/teacher/assignments" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors mb-4">
        <ArrowLeft size={14} /> Back to Assignments
      </Link>

      {/* Header card */}
      <div className="bg-white border border-brand-green-dark rounded-xl p-6 mb-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-800">{assignment.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1.5 bg-brand-pink/40 text-brand-pink-dark px-2.5 py-1 rounded-full font-semibold">
                <Tag size={11} /> {assignment.category}
              </span>
              {assignment.class && (
                <span className="inline-flex items-center gap-1.5 bg-brand-green text-brand-green-dark px-2.5 py-1 rounded-full font-semibold">
                  <GraduationCap size={11} /> {assignment.class}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 bg-brand-off-white border border-brand-green-dark px-2.5 py-1 rounded-full font-semibold">
                <Calendar size={11} /> Due {fmt(assignment.deadline)}
              </span>
              {past && (
                <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-600 px-2.5 py-1 rounded-full font-semibold">
                  <AlertCircle size={11} /> Past due
                </span>
              )}
            </div>
            {assignment.description && (
              <p className="text-sm text-gray-700 mt-4 leading-relaxed whitespace-pre-wrap">{assignment.description}</p>
            )}
          </div>
          <button
            onClick={openEdit}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-brand-green-dark text-white text-sm font-semibold rounded-xl hover:bg-green-400 transition-colors shadow-sm"
          >
            <Pencil size={14} /> Edit Assignment
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-brand-green">
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-green-dark">{submittedCount}/{rows.length}</p>
            <p className="text-xs text-gray-600 mt-0.5 font-medium">Submitted</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-pink-dark">{gradedCount}</p>
            <p className="text-xs text-gray-600 mt-0.5 font-medium">Graded</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">
              {rows.length > 0 ? Math.round((submittedCount / rows.length) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-600 mt-0.5 font-medium">Completion</p>
          </div>
        </div>
      </div>

      {/* Edit form (inline) */}
      {editing && (
        <div className="bg-white border border-brand-green-dark rounded-xl p-6 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Edit Assignment</h2>
            <button onClick={() => setEditing(false)} className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-brand-off-white">
              <X size={16} />
            </button>
          </div>

          {submissions.length > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800">
                This assignment already has {submissions.length} submission{submissions.length === 1 ? '' : 's'}. Editing may affect students.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Title *</label>
              <input
                className="w-full px-3 py-2.5 bg-white border border-brand-green-dark rounded-xl text-sm text-gray-800 focus:outline-none focus:border-brand-pink-dark focus:ring-2 focus:ring-brand-pink/40 transition"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Category *</label>
              <select
                className="w-full px-3 py-2.5 bg-white border border-brand-green-dark rounded-xl text-sm text-gray-800 focus:outline-none focus:border-brand-pink-dark"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Class *</label>
              <select
                className="w-full px-3 py-2.5 bg-white border border-brand-green-dark rounded-xl text-sm text-gray-800 focus:outline-none focus:border-brand-pink-dark"
                value={form.class}
                onChange={e => setForm(f => ({ ...f, class: e.target.value }))}
              >
                <option value="">Select a class…</option>
                {teacherClasses.length === 0 && <option value="" disabled>No classes available</option>}
                {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                {assignment.class && !teacherClasses.includes(assignment.class) && (
                  <option key={assignment.class} value={assignment.class}>{assignment.class}</option>
                )}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Deadline *</label>
              <input
                type="date"
                className="w-full px-3 py-2.5 bg-white border border-brand-green-dark rounded-xl text-sm text-gray-800 focus:outline-none focus:border-brand-pink-dark"
                min={today}
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Description</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2.5 bg-white border border-brand-green-dark rounded-xl text-sm text-gray-800 focus:outline-none focus:border-brand-pink-dark resize-none"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-brand-green-dark rounded-xl hover:bg-brand-off-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-brand-green-dark text-white rounded-xl hover:bg-green-400 disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by student name or NISN…"
        className="max-w-sm mb-3"
      />

      {/* Status filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === s
                ? 'bg-brand-green-dark text-white border border-brand-green-dark'
                : 'bg-white border border-brand-green-dark text-gray-600 hover:bg-brand-green'
            }`}
          >
            {s}
          </button>
        ))}
        <span className="text-xs text-gray-600 ml-auto">
          {filteredRows.length} of {rows.length} students
        </span>
      </div>

      {/* Submission status table */}
      <div className="bg-white border border-brand-green-dark rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-green-dark text-xs text-gray-600 font-semibold uppercase tracking-wide bg-brand-off-white">
                <th className="text-left px-5 py-3">Student</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">NISN</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Class</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Submitted</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Grade</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-green">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-600">
                    No students match this filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map(r => {
                  const statusBadge =
                    r.status === 'submitted'
                      ? { label: 'Submitted', cls: 'bg-brand-green text-brand-green-dark', Icon: CheckCircle }
                      : r.status === 'overdue'
                      ? { label: 'Overdue',   cls: 'bg-rose-50 text-rose-600 border border-rose-200', Icon: AlertCircle }
                      : { label: 'Not submitted', cls: 'bg-brand-pink/40 text-brand-pink-dark', Icon: Clock }
                  const Icon = statusBadge.Icon
                  return (
                    <tr key={r.nisn} className="hover:bg-brand-off-white transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center bg-brand-pink text-brand-pink-dark text-xs font-bold shrink-0">
                            {r.name[0]?.toUpperCase() ?? '?'}
                          </div>
                          <span className="font-medium text-gray-800">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-600">{r.nisn}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">{r.classLabel || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${statusBadge.cls}`}>
                          <Icon size={11} /> {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600 text-xs">
                        {r.submission ? fmt(r.submission.submitted_at) : '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {r.submission?.grade ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${GRADE_COLOR[r.submission.grade] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {r.submission.grade}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {r.submission?.file_url ? (
                          <a
                            href={r.submission.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-green-dark border border-brand-green-dark/40 px-2.5 py-1 rounded-lg hover:bg-brand-green/40 transition-colors"
                          >
                            <Download size={11} /> View
                          </a>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageTransition>
  )
}
