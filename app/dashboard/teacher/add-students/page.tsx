'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { UserPlus, Edit2, Trash2, X, Users, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Student {
  nisn: string
  name: string
  grade: string
  class: string
  department: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GRADES = ['10', '11', '12']
const CLASSES = ['A', 'B', 'C']
const CLASS_TABS = ['Semua', 'Kelas A', 'Kelas B', 'Kelas C']

const EMPTY_ADD = { nisn: '', name: '', grade: '10', class: 'A', department: '' }

// ── Main component ────────────────────────────────────────────────────────────

export default function AddStudentsPage() {
  const { user } = useAuth()

  const [students, setStudents] = useState<Student[]>([])
  const [activeTab, setActiveTab] = useState('Semua')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_ADD)
  const [addSaving, setAddSaving] = useState(false)

  // Edit form
  const [editTarget, setEditTarget] = useState<Student | null>(null)
  const [editForm, setEditForm] = useState({ name: '', grade: '10', class: 'A', department: '' })
  const [editSaving, setEditSaving] = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Copy password feedback
  const [copiedNisn, setCopiedNisn] = useState<string | null>(null)

  // ── Data load ──────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!user) return
    setError(null)
    const { data, error: err } = await supabase
      .from('students')
      .select('nisn, name, grade, class, department')
      .eq('added_by', user.id)
      .order('name', { ascending: true })
    if (err) { setError('Gagal memuat data siswa.'); setLoading(false); return }
    setStudents(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // ── Client-side filter ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (activeTab === 'Semua') return students
    const cls = activeTab.replace('Kelas ', '')
    return students.filter(s => s.class === cls)
  }, [students, activeTab])

  // ── Helpers ────────────────────────────────────────────────────────────────

  function openEdit(s: Student) {
    setShowAdd(false)
    setEditTarget(s)
    setEditForm({ name: s.name, grade: s.grade, class: s.class, department: s.department ?? '' })
  }

  function closeAdd() { setShowAdd(false); setAddForm(EMPTY_ADD) }
  function closeEdit() { setEditTarget(null) }

  async function copyPassword(nisn: string) {
    await navigator.clipboard.writeText(nisn + '1')
    setCopiedNisn(nisn)
    setTimeout(() => setCopiedNisn(null), 2000)
  }

  // ── Add student ────────────────────────────────────────────────────────────

  async function handleAdd() {
    const { nisn, name, grade, class: cls, department } = addForm
    if (!nisn.trim() || !name.trim()) { toast.error('NISN dan nama wajib diisi'); return }
    if (!/^\d+$/.test(nisn.trim())) { toast.error('NISN harus berupa angka'); return }
    if (!user) return

    setAddSaving(true)

    const { error: err } = await supabase.from('students').insert({
      nisn: nisn.trim(),
      name: name.trim(),
      grade,
      class: cls,
      department: department.trim() || null,
      password_hash: nisn.trim() + '1',
      added_by: user.id,
    })

    setAddSaving(false)

    if (err) {
      if (err.code === '23505') {
        toast.error('NISN sudah terdaftar. Gunakan NISN lain.')
      } else {
        toast.error('Gagal menambahkan siswa')
      }
      return
    }

    toast.success(`Siswa ditambahkan. Password: ${nisn.trim()}1`)
    closeAdd()
    load()
  }

  // ── Edit student ───────────────────────────────────────────────────────────

  async function handleEdit() {
    if (!editTarget) return
    const { name, grade, class: cls, department } = editForm
    if (!name.trim()) { toast.error('Nama wajib diisi'); return }

    setEditSaving(true)
    const { error: err } = await supabase
      .from('students')
      .update({ name: name.trim(), grade, class: cls, department: department.trim() || null })
      .eq('nisn', editTarget.nisn)
    setEditSaving(false)

    if (err) { toast.error('Gagal menyimpan perubahan'); return }
    toast.success('Data siswa diperbarui!')
    closeEdit()
    load()
  }

  // ── Delete student ─────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    // Keep submissions (grade history) — only delete the student record
    const { error: err } = await supabase
      .from('students')
      .delete()
      .eq('nisn', deleteTarget.nisn)
    setDeleting(false)
    if (err) { toast.error('Gagal menghapus siswa'); return }
    toast.success('Siswa dihapus.')
    setDeleteTarget(null)
    load()
  }

  // ── Shared form field renderer ─────────────────────────────────────────────

  function GradeClassFields({
    grade, cls, onChange,
  }: {
    grade: string
    cls: string
    onChange: (field: 'grade' | 'class', val: string) => void
  }) {
    return (
      <>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Kelas (Angkatan)</label>
          <select className="kreora-input" value={grade} onChange={e => onChange('grade', e.target.value)}>
            {GRADES.map(g => <option key={g} value={g}>Kelas {g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Kelas (Rombel)</label>
          <select className="kreora-input" value={cls} onChange={e => onChange('class', e.target.value)}>
            {CLASSES.map(c => <option key={c} value={c}>Kelas {c}</option>)}
          </select>
        </div>
      </>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 sm:p-8 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Guru Dashboard</p>
          <h1 className="font-display text-2xl font-bold text-gray-900">Tambah Siswa</h1>
        </div>
        <button
          onClick={() => { setShowAdd(true); closeEdit() }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm shadow-brand-200"
        >
          <UserPlus size={15} /> Tambah Siswa
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* ── Add form ── */}
      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 text-sm">Tambah Siswa Baru</h2>
            <button onClick={closeAdd} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">NISN</label>
              <input
                className="kreora-input font-mono"
                placeholder="Contoh: 0123456789"
                inputMode="numeric"
                value={addForm.nisn}
                onChange={e => setAddForm(f => ({ ...f, nisn: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nama Lengkap</label>
              <input
                className="kreora-input"
                placeholder="Nama siswa"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <GradeClassFields
              grade={addForm.grade}
              cls={addForm.class}
              onChange={(field, val) => setAddForm(f => ({ ...f, [field]: val }))}
            />
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Departemen / Jurusan <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input
                className="kreora-input"
                placeholder="Contoh: DKV"
                value={addForm.department}
                onChange={e => setAddForm(f => ({ ...f, department: e.target.value }))}
              />
            </div>
            {addForm.nisn && (
              <div className="sm:col-span-2 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-sm text-brand-700">
                Password otomatis: <span className="font-mono font-bold">{addForm.nisn}1</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={closeAdd} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Batal
            </button>
            <button
              onClick={handleAdd}
              disabled={addSaving}
              className="px-5 py-2 text-sm font-semibold bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {addSaving ? 'Menyimpan...' : 'Tambah Siswa'}
            </button>
          </div>
        </div>
      )}

      {/* ── Edit form ── */}
      {editTarget && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Edit Data Siswa</h2>
              <p className="text-xs text-gray-400 mt-0.5">NISN tidak dapat diubah</p>
            </div>
            <button onClick={closeEdit} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* NISN — read only */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">NISN</label>
              <input
                className="kreora-input font-mono bg-gray-50 text-gray-400 cursor-not-allowed"
                value={editTarget.nisn}
                disabled
                readOnly
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nama Lengkap</label>
              <input
                className="kreora-input"
                placeholder="Nama siswa"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <GradeClassFields
              grade={editForm.grade}
              cls={editForm.class}
              onChange={(field, val) => setEditForm(f => ({ ...f, [field]: val }))}
            />
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Departemen / Jurusan <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input
                className="kreora-input"
                placeholder="Contoh: DKV"
                value={editForm.department}
                onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={closeEdit} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Batal
            </button>
            <button
              onClick={handleEdit}
              disabled={editSaving}
              className="px-5 py-2 text-sm font-semibold bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      )}

      {/* ── Class filter tabs ── */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-0.5">
        {CLASS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              activeTab === tab
                ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-500'
            }`}
          >
            {tab}
            {tab !== 'Semua' && (
              <span className={`ml-1.5 text-xs ${activeTab === tab ? 'text-white/70' : 'text-gray-400'}`}>
                ({students.filter(s => s.class === tab.replace('Kelas ', '')).length})
              </span>
            )}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-auto shrink-0">{filtered.length} siswa</span>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 skeleton rounded-xl" />)}
        </div>
      ) : filtered.length === 0 && !error ? (
        <div className="text-center py-24">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={22} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700">
            {activeTab === 'Semua' ? 'Belum ada siswa' : `Tidak ada siswa di ${activeTab}`}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'Semua' ? 'Klik "Tambah Siswa" untuk mulai.' : 'Tambah siswa atau ubah filter kelas.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 font-semibold uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-5 py-3">NISN</th>
                  <th className="text-left px-4 py-3">Nama</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Kelas</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Departemen</th>
                  <th className="text-left px-4 py-3">Password</th>
                  <th className="text-right px-5 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr key={s.nisn} className="hover:bg-gray-50/60 transition-colors">
                    {/* NISN */}
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                        {s.nisn}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
                        >
                          {s.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{s.name}</span>
                      </div>
                    </td>

                    {/* Grade + class */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                        Kelas {s.grade} {s.class}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3.5 hidden md:table-cell text-sm text-gray-500">
                      {s.department ?? <span className="text-gray-300">—</span>}
                    </td>

                    {/* Auto password + copy */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-gray-500">{s.nisn}1</span>
                        <button
                          onClick={() => copyPassword(s.nisn)}
                          className="p-1 text-gray-300 hover:text-brand-500 transition-colors rounded"
                          title="Salin password"
                        >
                          {copiedNisn === s.nisn
                            ? <Check size={12} className="text-brand-500" />
                            : <Copy size={12} />
                          }
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Edit siswa"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus siswa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Delete confirm dialog ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">Hapus Siswa?</h3>
            <p className="text-sm text-gray-500 mb-1">
              <span className="font-medium text-gray-800">{deleteTarget.name}</span> akan dihapus dari daftar.
            </p>
            <p className="text-xs text-gray-400 mb-5">
              Riwayat pengumpulan dan nilai tetap tersimpan untuk keperluan rekap.
            </p>
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
