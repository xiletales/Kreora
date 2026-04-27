'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Plus, Edit2, Trash2, X, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = ['Ilustrasi', 'Fotografi', 'Desain', 'Kerajinan', 'Lukisan', 'Digital Art']

const EMPTY_FORM = { title: '', category: 'Ilustrasi', deadline: '', description: '' }

interface Assignment {
  id: string
  title: string
  category: string
  deadline: string
  description?: string | null
  created_at: string
  submissionCount: number
}

function getDiffDays(deadline: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  return Math.ceil((d.getTime() - today.getTime()) / 86_400_000)
}

function StatusBadge({ deadline }: { deadline: string }) {
  const diff = getDiffDays(deadline)
  if (diff < 0)   return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Lewat</span>
  if (diff <= 3)  return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-600">Segera</span>
  return               <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">Aktif</span>
}

export default function AssignmentPage() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Assignment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setError(null)

    const { data, error: err } = await supabase
      .from('assignments')
      .select('id, title, category, deadline, description, created_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (err) { setError('Gagal memuat tugas. Coba refresh halaman.'); setLoading(false); return }

    const ids = (data ?? []).map(a => a.id)
    let countMap: Record<string, number> = {}

    if (ids.length > 0) {
      const { data: subs } = await supabase
        .from('submissions')
        .select('assignment_id')
        .in('assignment_id', ids)
      subs?.forEach(s => { countMap[s.assignment_id] = (countMap[s.assignment_id] || 0) + 1 })
    }

    setAssignments((data ?? []).map(a => ({ ...a, submissionCount: countMap[a.id] || 0 })))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowCreate(true)
  }

  function openEdit(a: Assignment) {
    setShowCreate(false)
    setForm({ title: a.title, category: a.category, deadline: a.deadline, description: a.description ?? '' })
    setEditTarget(a)
  }

  function closeForm() {
    setShowCreate(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  async function handleCreate() {
    if (!form.title.trim()) { toast.error('Judul wajib diisi'); return }
    if (!form.deadline) { toast.error('Deadline wajib diisi'); return }
    if (!user) return
    setSaving(true)
    const { error: err } = await supabase.from('assignments').insert({
      teacher_id: user.id,
      title: form.title.trim(),
      category: form.category,
      deadline: form.deadline,
      description: form.description.trim() || null,
    })
    setSaving(false)
    if (err) { toast.error('Gagal membuat tugas'); return }
    toast.success('Tugas berhasil dibuat!')
    closeForm()
    load()
  }

  async function handleEditSave() {
    if (!editTarget) return
    if (!form.title.trim()) { toast.error('Judul wajib diisi'); return }
    if (!form.deadline) { toast.error('Deadline wajib diisi'); return }
    setSaving(true)
    const { error: err } = await supabase.from('assignments').update({
      title: form.title.trim(),
      category: form.category,
      deadline: form.deadline,
      description: form.description.trim() || null,
    }).eq('id', editTarget.id)
    setSaving(false)
    if (err) { toast.error('Gagal menyimpan perubahan'); return }
    toast.success('Tugas diperbarui!')
    closeForm()
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('submissions').delete().eq('assignment_id', deleteTarget.id)
    const { error: err } = await supabase.from('assignments').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    if (err) { toast.error('Gagal menghapus tugas'); return }
    toast.success('Tugas dihapus.')
    setDeleteTarget(null)
    load()
  }

  const isFormOpen = showCreate || !!editTarget
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-6 sm:p-8 max-w-4xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Guru Dashboard</p>
          <h1 className="font-display text-2xl font-bold text-gray-900">Tugas</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm shadow-brand-200"
        >
          <Plus size={15} /> Buat Tugas
        </button>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* ── Create / Edit form panel ── */}
      {isFormOpen && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 text-sm">
              {editTarget ? 'Edit Tugas' : 'Buat Tugas Baru'}
            </h2>
            <button onClick={closeForm} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Judul Tugas</label>
              <input
                className="kreora-input"
                placeholder="Contoh: Poster Anti Bullying"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Kategori</label>
              <select
                className="kreora-input"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Deadline</label>
              <input
                type="date"
                className="kreora-input"
                value={form.deadline}
                min={today}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Deskripsi <span className="text-gray-400 font-normal">(opsional)</span></label>
              <textarea
                className="kreora-input resize-none"
                rows={3}
                placeholder="Instruksi atau keterangan tambahan..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={closeForm}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={editTarget ? handleEditSave : handleCreate}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Menyimpan...' : editTarget ? 'Simpan Perubahan' : 'Buat Tugas'}
            </button>
          </div>
        </div>
      )}

      {/* ── Assignment list ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 h-24 skeleton" />
          ))}
        </div>
      ) : assignments.length === 0 && !error ? (
        <div className="text-center py-24">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={22} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700">Belum ada tugas</p>
          <p className="text-sm text-gray-400 mt-1">Klik &ldquo;Buat Tugas&rdquo; untuk mulai.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => {
            const editable = getDiffDays(a.deadline) > 3
            const formattedDeadline = new Date(a.deadline).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric',
            })

            return (
              <div
                key={a.id}
                className="bg-white border border-gray-100 rounded-2xl p-5 flex items-start gap-4 hover:border-gray-200 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <StatusBadge deadline={a.deadline} />
                    <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-100">
                      {a.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                    <span>Deadline: {formattedDeadline}</span>
                    <span>{a.submissionCount} pengumpulan</span>
                  </div>
                  {a.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{a.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  {editable ? (
                    <button
                      onClick={() => openEdit(a)}
                      className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={15} />
                    </button>
                  ) : (
                    <div className="relative group">
                      <button disabled className="p-2 text-gray-200 cursor-not-allowed rounded-lg">
                        <Edit2 size={15} />
                      </button>
                      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-56 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 pointer-events-none z-10 leading-snug">
                        Tidak bisa diedit (deadline terlalu dekat)
                        <div className="absolute top-full right-3 border-4 border-transparent border-t-gray-800" />
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setDeleteTarget(a)}
                    className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Delete confirmation dialog ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">Hapus Tugas?</h3>
            <p className="text-sm text-gray-500 mb-1">
              Tugas <span className="font-medium text-gray-800">&ldquo;{deleteTarget.title}&rdquo;</span> akan dihapus permanen.
            </p>
            <p className="text-sm text-rose-500 mb-5">Semua pengumpulan terkait juga akan ikut terhapus.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold bg-rose-500 text-white rounded-xl hover:bg-rose-600 disabled:opacity-60 transition-colors"
              >
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
