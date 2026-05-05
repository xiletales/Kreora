'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { UserPlus, Trash2, Copy, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '@/components/PageTransition'

interface Student {
  id: string
  nisn: string
  name: string
  grade: string
  class: string
  password: string
}

const EMPTY_FORM = { name: '', nisn: '', grade: '', className: '', password: '' }

export default function AddStudentsPage() {
  const { user } = useAuth()
  const [form, setForm] = useState(EMPTY_FORM)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function update(key: string, val: string) {
    setForm(f => {
      const next = { ...f, [key]: val }
      if (key === 'nisn' && !f.password) next.password = val + '1'
      return next
    })
  }

  const loadStudents = useCallback(async () => {
    if (!user) return
    setFetching(true)
    const { data } = await supabase
      .from('students')
      .select('id, nisn, name, grade, class, password')
      .eq('added_by', user.id)
      .order('created_at', { ascending: false })
    setStudents((data ?? []) as Student[])
    setFetching(false)
  }, [user])

  useEffect(() => { loadStudents() }, [loadStudents])

  async function handleSubmit() {
    if (!form.name || !form.nisn || !form.grade || !form.className) {
      toast.error('Name, NISN, grade, and class are required.')
      return
    }
    if (!/^\d+$/.test(form.nisn)) {
      toast.error('NISN must contain digits only.')
      return
    }
    if (!user) return

    setLoading(true)
    const password = form.password.trim() || form.nisn + '1'

    const payload = {
      name: form.name.trim(),
      nisn: form.nisn.trim(),
      grade: form.grade,
      class: form.className,
      password,
      added_by: user.id,
    }
    console.log('[AddStudent] inserting:', payload)

    const { error } = await supabase.from('students').insert(payload)

    setLoading(false)

    if (error) {
      if (error.code === '23505') {
        toast.error('A student with this NISN already exists.')
      } else {
        toast.error('Failed to add student: ' + error.message)
      }
      return
    }

    toast.success(`${form.name} added successfully.`)
    setForm(EMPTY_FORM)
    loadStudents()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from your class?`)) return
    const { error } = await supabase.from('students').delete().eq('id', id)
    if (error) { toast.error('Failed to remove student.'); return }
    toast.success(`${name} removed.`)
    setStudents(prev => prev.filter(s => s.id !== id))
  }

  function copyPassword(id: string, pwd: string) {
    navigator.clipboard.writeText(pwd)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <PageTransition className="p-6 w-full">
      <div className="mb-8 pl-4 border-l-4 border-[#337357]">
        <h1 className="text-2xl font-bold text-[#1a2e25]">Add Students</h1>
        <p className="text-sm text-[#5a7a6a] mt-0.5">Manage students in your class</p>
      </div>

      {/* Add form */}
      <div className="bg-white border border-[#E5EDE9] rounded-xl p-5 sm:p-6 mb-6 shadow-sm">
        <h2 className="font-semibold text-[#1a2e25] text-sm mb-4">New Student</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-[#5a7a6a] mb-1.5 block">Full Name *</label>
            <input className="kreora-input" placeholder="Student full name" value={form.name} onChange={e => update('name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-[#5a7a6a] mb-1.5 block">NISN *</label>
            <input className="kreora-input" placeholder="10-digit NISN" value={form.nisn} onChange={e => update('nisn', e.target.value)} maxLength={10} />
          </div>
          <div>
            <label className="text-xs font-medium text-[#5a7a6a] mb-1.5 block">Grade *</label>
            <select className="kreora-input" value={form.grade} onChange={e => update('grade', e.target.value)}>
              <option value="">Select grade</option>
              <option value="X">X</option>
              <option value="XI">XI</option>
              <option value="XII">XII</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[#5a7a6a] mb-1.5 block">Class *</label>
            <select className="kreora-input" value={form.className} onChange={e => update('className', e.target.value)}>
              <option value="">Select class</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-[#5a7a6a] mb-1.5 block">
              Password <span className="font-normal text-[#5a7a6a]/60">(default: NISN + &ldquo;1&rdquo;)</span>
            </label>
            <input className="kreora-input" placeholder={form.nisn ? form.nisn + '1' : 'Auto-set from NISN'} value={form.password} onChange={e => update('password', e.target.value)} />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#337357] text-white rounded-xl hover:bg-[#285e46] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
          {loading ? 'Adding...' : 'Add Student'}
        </button>
      </div>

      {/* Students list */}
      <div className="bg-white border border-[#E5EDE9] rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#1a2e25] text-sm">Your Students</h2>
          {!fetching && <span className="text-xs text-[#5a7a6a]">{students.length} student{students.length !== 1 ? 's' : ''}</span>}
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-[#5a7a6a]/30" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 bg-[#F8FAF9] rounded-xl flex items-center justify-center mx-auto mb-3">
              <UserPlus size={18} className="text-[#5a7a6a]" />
            </div>
            <p className="text-sm text-[#5a7a6a]">No students added yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 bg-[#F8FAF9] border border-[#E5EDE9] rounded-xl">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
                >
                  {s.name[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1a2e25] truncate">{s.name}</p>
                  <p className="text-xs text-[#5a7a6a]">NISN: {s.nisn}</p>
                </div>
                <span className="text-[10px] font-semibold text-[#5a7a6a] bg-[#E5EDE9] px-2 py-0.5 rounded-full shrink-0">
                  Grade {s.grade} {s.class}
                </span>
                <button
                  onClick={() => copyPassword(s.id, s.password)}
                  className="p-1.5 rounded-lg text-[#5a7a6a] hover:text-[#337357] hover:bg-[#337357]/10 transition-colors shrink-0"
                  title="Copy password"
                >
                  {copiedId === s.id ? <Check size={14} className="text-[#337357]" /> : <Copy size={14} />}
                </button>
                <button
                  onClick={() => handleDelete(s.id, s.name)}
                  className="p-1.5 rounded-lg text-[#5a7a6a] hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                  title="Remove student"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
