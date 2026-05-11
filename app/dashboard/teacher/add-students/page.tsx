'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useTeacherAuth } from '@/context/TeacherAuthContext'
import { UserPlus, Edit2, Trash2, X, Users, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import ClassFilterTabs, { ALL_CLASSES } from '@/components/ClassFilterTabs'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Student {
  nisn: string
  name: string
  grade: string
  class: string
  department: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Hardcoded options for the add/edit forms — may need to be adjusted to match
// school conventions. The class FILTER above the table is derived dynamically
// from the loaded students, so it always matches real data.
const GRADES = ['10', '11', '12']
const CLASSES = ['A', 'B', 'C']

const EMPTY_ADD = { nisn: '', name: '', grade: '10', class: 'A', department: '' }

// ── Main component ────────────────────────────────────────────────────────────

export default function AddStudentsPage() {
  const { user } = useTeacherAuth()

  const [students, setStudents] = useState<Student[]>([])
  const [activeClass, setActiveClass] = useState(ALL_CLASSES)
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
    if (err) { setError('Failed to load students.'); setLoading(false); return }
    setStudents(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // ── Client-side filter ─────────────────────────────────────────────────────

  const classesForTabs = useMemo(() => {
    const set = new Set<string>()
    students.forEach(s => {
      const label = [s.grade, s.class].filter(Boolean).join(' ').trim()
      if (label) set.add(label)
    })
    return Array.from(set).sort()
  }, [students])

  const filtered = useMemo(() => {
    if (activeClass === ALL_CLASSES) return students
    return students.filter(s => {
      const label = [s.grade, s.class].filter(Boolean).join(' ').trim()
      return label === activeClass
    })
  }, [students, activeClass])

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
    if (!nisn.trim() || !name.trim()) { toast.error('NISN and name are required'); return }
    if (!/^\d+$/.test(nisn.trim())) { toast.error('NISN must be numeric'); return }
    if (!user) return

    setAddSaving(true)

    const res = await fetch('/api/teacher/add-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nisn: nisn.trim(),
        name: name.trim(),
        grade,
        class: cls,
        password: nisn.trim() + '1',
      })
    })
    const result = await res.json()
    if (!res.ok) {
      toast.error('Failed to add student: ' + result.error)
      setAddSaving(false)
      return
    }
    toast.success('Student added successfully!')
    setAddSaving(false)
    closeAdd()
    load()
  }

  // ── Edit student ───────────────────────────────────────────────────────────

  async function handleEdit() {
    if (!editTarget) return
    const { name, grade, class: cls, department } = editForm
    if (!name.trim()) { toast.error('Name is required'); return }

    setEditSaving(true)
    const { error: err } = await supabase
      .from('students')
      .update({ name: name.trim(), grade, class: cls, department: department.trim() || null })
      .eq('nisn', editTarget.nisn)
    setEditSaving(false)

    if (err) { toast.error('Failed to save changes'); return }
    toast.success('Student updated.')
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
    if (err) { toast.error('Failed to delete student'); return }
    toast.success('Student deleted.')
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
          <label className="text-xs font-medium text-gray-600 mb-1 block">Grade (Class)</label>
          <select className="kreora-input" value={grade} onChange={e => onChange('grade', e.target.value)}>
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Class</label>
          <select className="kreora-input" value={cls} onChange={e => onChange('class', e.target.value)}>
            {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
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
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Teacher Dashboard</p>
          <h1 className="font-display text-2xl font-bold text-gray-900">Add Student</h1>
        </div>
        <button
          onClick={() => { setShowAdd(true); closeEdit() }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green-dark text-white text-sm font-semibold hover:bg-green-400 transition-colors shadow-sm "
        >
          <UserPlus size={15} /> Add Student
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
            <h2 className="font-semibold text-gray-900 text-sm">Add New Student</h2>
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
              <label className="text-xs font-medium text-gray-600 mb-1 block">Full Name</label>
              <input
                className="kreora-input"
                placeholder="Student name"
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
                Department / Major <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                className="kreora-input"
                placeholder="Contoh: DKV"
                value={addForm.department}
                onChange={e => setAddForm(f => ({ ...f, department: e.target.value }))}
              />
            </div>
            {addForm.nisn && (
              <div className="sm:col-span-2 bg-brand-green border border-brand-green-dark rounded-xl px-4 py-3 text-sm text-gray-700">
                Password otomatis: <span className="font-mono font-bold">{addForm.nisn}1</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={closeAdd} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={addSaving}
              className="px-5 py-2 text-sm font-semibold bg-brand-green-dark text-white rounded-xl hover:bg-green-400 disabled:opacity-60 transition-colors"
            >
              {addSaving ? 'Saving...' : 'Add Student'}
            </button>
          </div>
        </div>
      )}

      {/* ── Edit form ── */}
      {editTarget && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Edit Student</h2>
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
              <label className="text-xs font-medium text-gray-600 mb-1 block">Full Name</label>
              <input
                className="kreora-input"
                placeholder="Student name"
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
                Department / Major <span className="text-gray-400 font-normal">(optional)</span>
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
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={editSaving}
              className="px-5 py-2 text-sm font-semibold bg-brand-green-dark text-white rounded-xl hover:bg-green-400 disabled:opacity-60 transition-colors"
            >
              {editSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── Class filter tabs ── */}
      <div className="flex items-center gap-3 mb-5">
        <ClassFilterTabs
          classes={classesForTabs}
          selected={activeClass}
          onChange={setActiveClass}
          className="flex-1 min-w-0"
        />
        <span className="text-xs text-gray-400 ml-auto shrink-0">{filtered.length} students</span>
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
            {activeClass === ALL_CLASSES ? 'No students added yet.' : `No students in ${activeClass}`}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {activeClass === ALL_CLASSES ? 'Click "Add Student" to begin.' : 'Add a student or change the class filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 font-semibold uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-5 py-3">NISN</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Class</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Department</th>
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
                          className="w-7 h-7 rounded-full flex items-center justify-center text-brand-pink-dark text-xs font-bold shrink-0"
                          style={{ background: 'linear-gradient(135deg, #F9D5E5, #F0A8C4)' }}
                        >
                          {s.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{s.name}</span>
                      </div>
                    </td>

                    {/* Grade + class */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                        Grade {s.grade} {s.class}
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
                          className="p-1 text-gray-300 hover:text-brand-green-dark transition-colors rounded"
                          title="Salin password"
                        >
                          {copiedNisn === s.nisn
                            ? <Check size={12} className="text-brand-green-dark" />
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
                          className="p-2 text-gray-400 hover:text-brand-green-dark hover:bg-brand-green rounded-lg transition-colors"
                          title="Edit student"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete student"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">Delete Student?</h3>
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
