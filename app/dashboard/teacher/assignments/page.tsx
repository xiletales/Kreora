'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/context/AuthContext'
import { Plus, Trash2, X, ClipboardList, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CATEGORIES = ['Illustration', 'Poster', 'Logo', 'Digital', 'Painting', 'Animation']
const TYPES = ['video', 'visual', 'project'] as const

const EMPTY_FORM = {
  title:       '',
  category:    'Illustration',
  deadline:    '',
  description: '',
  type:        'visual' as typeof TYPES[number],
}

interface Assignment {
  id: string
  title: string
  category: string
  deadline: string
  description?: string | null
  status: string
  created_at: string
  submissionCount: number
}

function deadlineBadge(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  const days = Math.ceil(diff / 86_400_000)
  if (diff < 0)  return { label: 'Past due', cls: 'bg-rose-100 text-rose-600' }
  if (days <= 3) return { label: `${days}d left`, cls: 'bg-amber-100 text-amber-700' }
  return              { label: 'Active', cls: 'bg-[#337357]/10 text-[#337357]' }
}

function typeBadge(type: string) {
  const map: Record<string, string> = {
    video:   'bg-blue-100 text-blue-700',
    visual:  'bg-purple-100 text-purple-700',
    project: 'bg-orange-100 text-orange-700',
  }
  return map[type] ?? 'bg-gray-100 text-gray-600'
}

export default function AssignmentsPage() {
  const { user } = useAuth()
  const [assignments, setAssignments]   = useState<Assignment[]>([])
  const [loading, setLoading]           = useState(true)
  const [fetchError, setFetchError]     = useState<string | null>(null)
  const [showForm, setShowForm]         = useState(false)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null)
  const [deleting, setDeleting]         = useState(false)

  useEffect(() => {
    console.log('[AssignmentsPage] user:', user)

    if (!user?.id) {
      // AuthContext still loading — keep spinner until user resolves
      return
    }

    setLoading(true)
    setFetchError(null)

    async function load() {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[AssignmentsPage] fetch error:', error)
        setFetchError(`${error.message} (code: ${error.code})`)
        setLoading(false)
        return
      }

      const ids = (data ?? []).map((a: Assignment) => a.id)
      let countMap: Record<string, number> = {}

      if (ids.length > 0) {
        const { data: subs } = await supabase
          .from('submissions')
          .select('assignment_id')
          .in('assignment_id', ids)
        subs?.forEach((s: { assignment_id: string }) => {
          countMap[s.assignment_id] = (countMap[s.assignment_id] || 0) + 1
        })
      }

      setAssignments((data ?? []).map((a: Assignment) => ({ ...a, submissionCount: countMap[a.id] || 0 })))
      setLoading(false)
    }

    load()
  }, [user?.id])

  function closeForm() { setShowForm(false); setForm(EMPTY_FORM) }

  async function handleCreate() {
    if (!form.title.trim()) { toast.error('Title is required.'); return }
    if (!form.deadline)     { toast.error('Deadline is required.'); return }
    if (!user?.id) return

    setSaving(true)
    const { error } = await supabase.from('assignments').insert({
      teacher_id:  user.id,
      title:       form.title.trim(),
      category:    form.category,
      deadline:    form.deadline,
      description: form.description.trim() || null,
      status:      form.type,
    })
    setSaving(false)

    if (error) {
      console.error('[AssignmentsPage] insert error:', error)
      toast.error('Failed to create assignment.')
      return
    }

    toast.success('Assignment created.')
    closeForm()

    // Reload
    const { data } = await supabase
      .from('assignments')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
    setAssignments((data ?? []).map((a: Assignment) => ({ ...a, submissionCount: 0 })))
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

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="pl-4 border-l-4 border-[#337357]">
          <h1 className="text-2xl font-bold text-[#1a2e25]">Assignments</h1>
          <p className="text-sm text-[#5a7a6a] mt-0.5">Manage and track student assignments</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#337357] text-white text-sm font-semibold hover:bg-[#285e46] transition-colors shadow-sm"
        >
          <Plus size={15} />
          New Assignment
        </button>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load assignments</p>
            <p className="text-xs mt-0.5 text-rose-600">{fetchError}</p>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-[#E5EDE9] rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-[#1a2e25]">New Assignment</h2>
            <button
              onClick={closeForm}
              className="p-1.5 text-[#5a7a6a] hover:text-[#1a2e25] rounded-lg hover:bg-[#F8FAF9] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-[#5a7a6a] mb-1.5 block">Title *</label>
              <input
                className="kreora-input"
                placeholder="e.g. Anti-Bullying Poster"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5a7a6a] mb-1.5 block">Category *</label>
              <select className="kreora-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#5a7a6a] mb-1.5 block">Type *</label>
              <select className="kreora-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof TYPES[number] }))}>
                {TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#5a7a6a] mb-1.5 block">Deadline *</label>
              <input
                type="date"
                className="kreora-input"
                min={today}
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-[#5a7a6a] mb-1.5 block">
                Description <span className="font-normal text-[#5a7a6a]/60">(optional)</span>
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
              className="px-4 py-2 text-sm font-medium text-[#5a7a6a] border border-[#E5EDE9] rounded-xl hover:bg-[#F8FAF9] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-[#337357] text-white rounded-xl hover:bg-[#285e46] disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E5EDE9] rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : !fetchError && assignments.length === 0 ? (
        <div className="text-center py-24 bg-white border border-[#E5EDE9] rounded-xl shadow-sm">
          <div className="w-12 h-12 bg-[#F8FAF9] rounded-xl flex items-center justify-center mx-auto mb-3">
            <ClipboardList size={20} className="text-[#5a7a6a]" />
          </div>
          <p className="font-semibold text-[#1a2e25]">No assignments yet</p>
          <p className="text-sm text-[#5a7a6a] mt-1">Click "New Assignment" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => {
            const dlBadge = deadlineBadge(a.deadline)
            return (
              <div
                key={a.id}
                className="w-full bg-white border border-[#E5EDE9] rounded-xl p-5 flex items-start gap-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${dlBadge.cls}`}>
                      {dlBadge.label}
                    </span>
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {a.category}
                    </span>
                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${typeBadge(a.status)}`}>
                      {a.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-[#1a2e25] text-sm">{a.title}</h3>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-[#5a7a6a]">
                    <span>
                      Due {new Date(a.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span>{a.submissionCount} submission{a.submissionCount !== 1 ? 's' : ''}</span>
                  </div>
                  {a.description && (
                    <p className="text-xs text-[#5a7a6a] mt-2 line-clamp-2 leading-relaxed">{a.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setDeleteTarget(a)}
                  className="p-2 text-[#5a7a6a] hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                  title="Delete assignment"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5EDE9] p-6 max-w-sm w-full">
            <h3 className="font-semibold text-[#1a2e25] mb-2">Delete Assignment?</h3>
            <p className="text-sm text-[#5a7a6a] mb-1">
              <span className="font-medium text-[#1a2e25]">&ldquo;{deleteTarget.title}&rdquo;</span> will be permanently deleted.
            </p>
            <p className="text-sm text-rose-500 mb-5">All related submissions will also be deleted.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium border border-[#E5EDE9] rounded-xl hover:bg-[#F8FAF9] transition-colors text-[#1a2e25]"
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
    </div>
  )
}
