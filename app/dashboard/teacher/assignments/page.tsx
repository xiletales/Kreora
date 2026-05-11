'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Plus, Trash2, X, ClipboardList, Loader2, AlertCircle, Pencil, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import PageTransition from '@/components/PageTransition'
import ClassFilterTabs, { ALL_CLASSES } from '@/components/ClassFilterTabs'
import Pagination from '@/components/Pagination'

const PAGE_SIZE = 10

const listContainer = { show: { transition: { staggerChildren: 0.07 } } }
const listItem = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

const CATEGORIES = ['Illustration', 'Poster', 'Logo', 'Digital', 'Painting', 'Animation']
const DEADLINE_FILTERS = ['All', 'This Week', 'This Month', 'Overdue'] as const
const SORT_OPTIONS = ['Newest First', 'Oldest First', 'Deadline Soonest'] as const

type DeadlineFilter = typeof DEADLINE_FILTERS[number]
type SortOption = typeof SORT_OPTIONS[number]

const EMPTY_FORM = {
  title:       '',
  category:    'Illustration',
  class:  '',
  deadline:    '',
  description: '',
}

interface Assignment {
  id: string
  title: string
  category: string
  class: string | null
  deadline: string
  description?: string | null
  created_at: string
  submissionCount: number
}

function deadlineBadge(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  const days = Math.ceil(diff / 86_400_000)
  if (diff < 0)  return { label: 'Past due', cls: 'bg-rose-100 text-rose-600' }
  if (days <= 3) return { label: `${days}d left`, cls: 'bg-amber-100 text-amber-700' }
  return              { label: 'Active', cls: 'bg-brand-green text-brand-green-dark' }
}

export default function AssignmentsPage() {
  const { user } = useAuth()
  const [assignments, setAssignments]   = useState<Assignment[]>([])
  const [teacherClasses, setTeacherClasses] = useState<string[]>([])
  const [loading, setLoading]           = useState(true)
  const [fetchError, setFetchError]     = useState<string | null>(null)
  const [showForm, setShowForm]         = useState(false)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const [activeClass, setActiveClass]       = useState(ALL_CLASSES)
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [filterDeadline, setFilterDeadline] = useState<DeadlineFilter>('All')
  const [sortBy, setSortBy]                 = useState<SortOption>('Newest First')
  const [page, setPage]                     = useState(1)

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [activeClass, filterCategory, filterDeadline, sortBy])

  const loadAssignments = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setFetchError(null)

    const { data, error } = await supabase
      .from('assignments')
      .select('id, teacher_id, title, category, class, deadline, description, created_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[AssignmentsPage] fetch error:', error)
      setFetchError(`${error.message} (code: ${error.code})`)
      setLoading(false)
      return
    }

    const ids = (data ?? []).map((a: { id: string }) => a.id)
    const countMap: Record<string, number> = {}

    if (ids.length > 0) {
      const { data: subs } = await supabase
        .from('submissions')
        .select('assignment_id')
        .in('assignment_id', ids)
      subs?.forEach((s: { assignment_id: string }) => {
        countMap[s.assignment_id] = (countMap[s.assignment_id] || 0) + 1
      })
    }

    setAssignments((data ?? []).map((a) => ({
      ...(a as Omit<Assignment, 'submissionCount'>),
      submissionCount: countMap[a.id] || 0,
    })))
    setLoading(false)
  }, [user?.id])

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

  useEffect(() => {
    if (!user?.id) return
    loadAssignments()
    loadTeacherClasses()
  }, [user, loadAssignments, loadTeacherClasses])

  function closeForm() { setShowForm(false); setForm(EMPTY_FORM) }

  async function handleCreate() {
    if (!user?.id) { toast.error('Not authenticated'); return }
    if (!form.title.trim()) { toast.error('Title is required.'); return }
    if (!form.deadline)     { toast.error('Deadline is required.'); return }
    if (!form.class)   { toast.error('Class is required.'); return }

    const payload = {
      title:       form.title.trim(),
      category:    form.category,
      class:  form.class,
      deadline:    form.deadline,
      description: form.description.trim() || null,
      teacher_id:  user.id,
    }

    setSaving(true)
    const { error: insertError } = await supabase.from('assignments').insert(payload)
    setSaving(false)

    if (insertError) {
      console.error('Insert error:', JSON.stringify(insertError))
      toast.error('Failed to create assignment: ' + (insertError.message || insertError.code || JSON.stringify(insertError)))
      return
    }

    toast.success('Assignment created')
    setForm(EMPTY_FORM)
    setShowForm(false)
    await loadAssignments()
  }

  async function handleDelete() {
    if (!deleteTarget || !user?.id) return
    setDeleting(true)
    await supabase.from('submissions').delete().eq('assignment_id', deleteTarget.id)
    const { error } = await supabase.from('assignments').delete().eq('id', deleteTarget.id)
    setDeleting(false)

    if (error) { toast.error('Failed to delete assignment.'); return }

    toast.success('Assignment deleted.')
    setAssignments(prev => prev.filter(a => a.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  // Class list shown in the tabs: union of teacher's known classes + classes that
  // already exist on existing assignments (so legacy data still surfaces).
  const classesForTabs = useMemo(() => {
    const set = new Set<string>(teacherClasses)
    assignments.forEach(a => { if (a.class) set.add(a.class) })
    return Array.from(set).sort()
  }, [assignments, teacherClasses])

  const visibleAssignments = useMemo(() => {
    const now = Date.now()
    const week  = now + 7  * 86_400_000
    const month = now + 30 * 86_400_000

    let arr = assignments

    if (activeClass !== ALL_CLASSES) {
      arr = arr.filter(a => (a.class ?? '') === activeClass)
    }
    if (filterCategory !== 'All') arr = arr.filter(a => a.category === filterCategory)
    if (filterDeadline !== 'All') {
      arr = arr.filter(a => {
        const t = new Date(a.deadline).getTime()
        if (filterDeadline === 'This Week')  return t >= now && t <= week
        if (filterDeadline === 'This Month') return t >= now && t <= month
        if (filterDeadline === 'Overdue')    return t < now
        return true
      })
    }

    const sorted = [...arr]
    if (sortBy === 'Newest First')      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    if (sortBy === 'Oldest First')      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (sortBy === 'Deadline Soonest')  sorted.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    return sorted
  }, [assignments, activeClass, filterCategory, filterDeadline, sortBy])

  const totalPages = Math.max(1, Math.ceil(visibleAssignments.length / PAGE_SIZE))
  const pagedAssignments = useMemo(
    () => visibleAssignments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visibleAssignments, page],
  )

  const today = new Date().toISOString().split('T')[0]
  const filterSelectCls = 'text-xs font-medium text-gray-800 bg-white border border-brand-green-dark rounded-lg px-3 py-1.5 outline-none focus:border-brand-pink-dark transition-colors'

  return (
    <PageTransition className="p-6 w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="pl-4 border-l-4 border-brand-green-dark">
          <h1 className="text-2xl font-bold text-gray-800">Assignments</h1>
          <p className="text-sm text-gray-600 mt-0.5">Manage and track student assignments</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green-dark text-white text-sm font-semibold hover:bg-green-400 transition-colors shadow-sm"
        >
          <Plus size={15} />
          New Assignment
        </button>
      </div>

      {/* Class filter tabs */}
      {!loading && !fetchError && (
        <ClassFilterTabs
          classes={classesForTabs}
          selected={activeClass}
          onChange={setActiveClass}
          className="mb-5"
        />
      )}

      {/* Error banner */}
      {fetchError && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load assignments</p>
            <p className="text-xs mt-0.5 text-rose-600">{fetchError}</p>
            {fetchError.includes('class') && (
              <p className="text-xs mt-1.5 text-rose-600">
                Run the migration at <code className="bg-rose-100 px-1 rounded">supabase/migrations/add_class_to_assignments.sql</code> in your Supabase SQL editor.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-brand-green-dark rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800">New Assignment</h2>
            <button
              onClick={closeForm}
              className="p-1.5 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-brand-off-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Title *</label>
              <input
                className="kreora-input"
                placeholder="e.g. Anti-Bullying Poster"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Category *</label>
              <select className="kreora-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Class *</label>
              <select
                className="kreora-input"
                value={form.class}
                onChange={e => setForm(f => ({ ...f, class: e.target.value }))}
              >
                <option value="">Select a class…</option>
                {teacherClasses.length === 0 && (
                  <option value="" disabled>
                    Add students first to populate this list
                  </option>
                )}
                {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Deadline *</label>
              <input
                type="date"
                className="kreora-input"
                min={today}
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Description <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <textarea
                className="kreora-input resize-none"
                rows={3}
                placeholder="Instructions or additional notes..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={closeForm}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-brand-green-dark rounded-xl hover:bg-brand-off-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-brand-green-dark text-white rounded-xl hover:bg-green-400 disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      {!loading && !fetchError && assignments.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-5 px-1">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 font-medium">Category</label>
            <select className={filterSelectCls} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="All">All</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 font-medium">Deadline</label>
            <select className={filterSelectCls} value={filterDeadline} onChange={e => setFilterDeadline(e.target.value as DeadlineFilter)}>
              {DEADLINE_FILTERS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 font-medium">Sort</label>
            <select className={filterSelectCls} value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}>
              {SORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <span className="text-xs text-gray-600 ml-auto">
            Showing {visibleAssignments.length} of {assignments.length} assignments
          </span>
        </div>
      )}

      {/* List as table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-brand-green-dark rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : !fetchError && assignments.length === 0 ? (
        <div className="text-center py-24 bg-white border border-brand-green-dark rounded-xl shadow-sm">
          <div className="w-12 h-12 bg-brand-off-white rounded-xl flex items-center justify-center mx-auto mb-3">
            <ClipboardList size={20} className="text-gray-600" />
          </div>
          <p className="font-semibold text-gray-800">No assignments yet</p>
          <p className="text-sm text-gray-600 mt-1">Click &quot;New Assignment&quot; to get started.</p>
        </div>
      ) : visibleAssignments.length === 0 ? (
        <div className="text-center py-16 bg-white border border-brand-green-dark rounded-xl shadow-sm">
          <p className="text-sm text-gray-600">No assignments match the current filters.</p>
        </div>
      ) : (
        <motion.div
          className="bg-white border border-brand-green-dark rounded-xl shadow-sm overflow-hidden"
          variants={listContainer}
          initial="hidden"
          animate="show"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-green-dark text-xs text-gray-600 font-semibold uppercase tracking-wide bg-brand-off-white">
                  <th className="text-left px-5 py-3">Title</th>
                  <th className="text-left px-4 py-3">Class</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Deadline</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Status</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Submissions</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-green">
                {pagedAssignments.map(a => {
                  const dlBadge = deadlineBadge(a.deadline)
                  return (
                    <motion.tr key={a.id} variants={listItem} className="hover:bg-brand-off-white transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/dashboard/teacher/assignments/${a.id}`} className="block group">
                          <p className="font-semibold text-gray-800 group-hover:text-brand-pink-dark transition-colors">{a.title}</p>
                          {a.description && (
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{a.description}</p>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {a.class ? (
                          <span className="text-xs font-semibold text-brand-green-dark bg-brand-green px-2.5 py-0.5 rounded-full">
                            {a.class}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {a.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600 text-xs">
                        {new Date(a.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${dlBadge.cls}`}>
                          {dlBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-600 text-xs">
                        {a.submissionCount} submission{a.submissionCount !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/teacher/assignments/${a.id}?edit=1`}
                            className="p-2 text-gray-600 hover:text-brand-pink-dark hover:bg-brand-pink/30 rounded-lg transition-colors"
                            title="Edit assignment"
                          >
                            <Pencil size={15} />
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(a)}
                            className="p-2 text-gray-600 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete assignment"
                          >
                            <Trash2 size={15} />
                          </button>
                          <Link
                            href={`/dashboard/teacher/assignments/${a.id}`}
                            className="p-2 text-gray-600 hover:text-brand-green-dark hover:bg-brand-green rounded-lg transition-colors"
                            title="View details"
                          >
                            <ChevronRight size={15} />
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {!loading && !fetchError && visibleAssignments.length > 0 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-xl border border-brand-green-dark p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-800 mb-2">Delete Assignment?</h3>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium text-gray-800">&ldquo;{deleteTarget.title}&rdquo;</span> will be permanently deleted.
            </p>
            <p className="text-sm text-rose-500 mb-5">All related submissions will also be deleted.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium border border-brand-green-dark rounded-xl hover:bg-brand-off-white transition-colors text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold bg-rose-500 text-white rounded-xl hover:bg-rose-600 disabled:opacity-60 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  )
}
