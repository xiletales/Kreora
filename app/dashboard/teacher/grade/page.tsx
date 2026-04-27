'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Download, Star, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Student {
  nisn: string
  name: string
  grade: string
  class: string
}

interface Submission {
  id: string
  file_url: string | null
  submitted_at: string
  grade: string | null
  assignment_id: string
  students: Student | null
}

interface Assignment {
  id: string
  title: string
  category: string
  deadline: string
}

interface Group {
  assignment: Assignment
  submissions: Submission[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const GRADE_OPTIONS = ['', 'A', 'B', 'C', 'D']

const GRADE_CLS: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-amber-100 text-amber-700',
  D: 'bg-rose-100 text-rose-600',
}

const CLASS_TABS = ['Semua', 'Kelas A', 'Kelas B', 'Kelas C']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GradePage() {
  const { user } = useAuth()

  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track grades locally so UI responds instantly on dropdown change
  const [gradeMap, setGradeMap] = useState<Record<string, string | null>>({})
  // Set of submission IDs currently being saved
  const [saving, setSaving] = useState<Set<string>>(new Set())
  // Collapsed assignment groups
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const [activeTab, setActiveTab] = useState('Semua')

  const load = useCallback(async () => {
    if (!user) return
    setError(null)

    // Step 1: fetch teacher's assignments
    const { data: assignments, error: aErr } = await supabase
      .from('assignments')
      .select('id, title, category, deadline')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (aErr) { setError('Gagal memuat data penilaian.'); setLoading(false); return }
    if (!assignments || assignments.length === 0) { setGroups([]); setLoading(false); return }

    const assignmentIds = assignments.map(a => a.id)

    // Step 2: fetch submissions for those assignments, joined with students
    const { data: submissions, error: sErr } = await supabase
      .from('submissions')
      .select('id, file_url, submitted_at, grade, assignment_id, students(nisn, name, grade, class)')
      .in('assignment_id', assignmentIds)
      .order('submitted_at', { ascending: false })

    if (sErr) { setError('Gagal memuat data pengumpulan.'); setLoading(false); return }

    // Build initial grade map from DB values
    const initGrades: Record<string, string | null> = {}
    ;(submissions ?? []).forEach(s => { initGrades[s.id] = s.grade })
    setGradeMap(initGrades)

    // Group submissions by assignment
    const subsByAssignment: Record<string, Submission[]> = {}
    ;(submissions ?? []).forEach(s => {
      if (!subsByAssignment[s.assignment_id]) subsByAssignment[s.assignment_id] = []
      subsByAssignment[s.assignment_id].push(s as unknown as Submission)
    })

    setGroups(
      assignments.map(a => ({
        assignment: a,
        submissions: subsByAssignment[a.id] ?? [],
      }))
    )
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // Filter submissions client-side by active class tab
  const filtered: Group[] = useMemo(() => {
    if (activeTab === 'Semua') return groups
    const cls = activeTab.replace('Kelas ', '') // "Kelas A" → "A"
    return groups.map(g => ({
      ...g,
      submissions: g.submissions.filter(s => s.students?.class === cls),
    })).filter(g => g.submissions.length > 0)
  }, [groups, activeTab])

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleGradeChange(submissionId: string, value: string) {
    const gradeVal = value || null
    // Optimistic update
    setGradeMap(prev => ({ ...prev, [submissionId]: gradeVal }))
    setSaving(prev => new Set(prev).add(submissionId))

    const { error: err } = await supabase
      .from('submissions')
      .update({ grade: gradeVal })
      .eq('id', submissionId)

    setSaving(prev => { const next = new Set(prev); next.delete(submissionId); return next })

    if (err) {
      toast.error('Gagal menyimpan nilai')
      // Revert on error
      setGradeMap(prev => ({ ...prev, [submissionId]: groups
        .flatMap(g => g.submissions)
        .find(s => s.id === submissionId)?.grade ?? null
      }))
    }
  }

  const totalGroups = filtered.length
  const totalSubs = filtered.reduce((n, g) => n + g.submissions.length, 0)
  const gradedCount = filtered.reduce((n, g) => n + g.submissions.filter(s => gradeMap[s.id]).length, 0)

  return (
    <div className="p-6 sm:p-8 max-w-5xl">

      {/* ── Header ── */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Guru Dashboard</p>
        <h1 className="font-display text-2xl font-bold text-gray-900">Penilaian</h1>
      </div>

      {/* ── Summary row ── */}
      {!loading && !error && (
        <div className="flex items-center gap-6 mb-6 text-sm text-gray-500">
          <span>{totalGroups} tugas</span>
          <span className="text-gray-200">|</span>
          <span>{totalSubs} pengumpulan</span>
          <span className="text-gray-200">|</span>
          <span className="text-brand-600 font-medium">{gradedCount} sudah dinilai</span>
        </div>
      )}

      {/* ── Class filter tabs ── */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-0.5">
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
          </button>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="h-12 skeleton" />
              <div className="p-4 space-y-3">
                {[...Array(2)].map((_, j) => <div key={j} className="h-14 skeleton rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 && !error ? (
        <div className="text-center py-24">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star size={22} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700">Belum ada pengumpulan</p>
          <p className="text-sm text-gray-400 mt-1">Pengumpulan siswa akan muncul di sini setelah dikirim.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(({ assignment, submissions }) => {
            const isCollapsed = collapsed.has(assignment.id)
            const gradedInGroup = submissions.filter(s => gradeMap[s.id]).length

            return (
              <div key={assignment.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">

                {/* Group header */}
                <button
                  onClick={() => toggleCollapse(assignment.id)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full shrink-0">
                      {assignment.category}
                    </span>
                    <span className="font-semibold text-gray-900 truncate">{assignment.title}</span>
                    <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
                      Deadline: {fmtDate(assignment.deadline)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs text-gray-400">
                      {gradedInGroup}/{submissions.length} dinilai
                    </span>
                    {isCollapsed ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronUp size={15} className="text-gray-400" />}
                  </div>
                </button>

                {/* Submissions table */}
                {!isCollapsed && (
                  <div className="border-t border-gray-100">
                    {submissions.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">Belum ada pengumpulan untuk tugas ini.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                              <th className="text-left px-5 py-2.5">Nama Siswa</th>
                              <th className="text-left px-4 py-2.5 hidden sm:table-cell">Dikumpulkan</th>
                              <th className="text-left px-4 py-2.5 hidden md:table-cell">File</th>
                              <th className="text-left px-4 py-2.5">Nilai</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {submissions.map(sub => {
                              const grade = gradeMap[sub.id]
                              const isSaving = saving.has(sub.id)
                              const student = sub.students

                              return (
                                <tr key={sub.id} className="hover:bg-gray-50/60 transition-colors">
                                  {/* Student name + class badge */}
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                        style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}>
                                        {(student?.name?.[0] || '?').toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-900 leading-tight">{student?.name ?? '—'}</p>
                                        {student && (
                                          <span className="text-[10px] text-gray-400">
                                            Kelas {student.grade} {student.class}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Submitted at */}
                                  <td className="px-4 py-3 hidden sm:table-cell">
                                    <p className="text-gray-600">{fmtDate(sub.submitted_at)}</p>
                                    <p className="text-xs text-gray-400">{fmtTime(sub.submitted_at)}</p>
                                  </td>

                                  {/* File download */}
                                  <td className="px-4 py-3 hidden md:table-cell">
                                    {sub.file_url ? (
                                      <a
                                        href={sub.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-medium text-xs"
                                      >
                                        <Download size={13} /> Unduh
                                      </a>
                                    ) : (
                                      <span className="text-gray-300 text-xs">—</span>
                                    )}
                                  </td>

                                  {/* Grade dropdown + badge */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="relative">
                                        <select
                                          value={grade ?? ''}
                                          onChange={e => handleGradeChange(sub.id, e.target.value)}
                                          disabled={isSaving}
                                          className={`appearance-none text-sm font-semibold border rounded-lg px-3 py-1.5 pr-7 outline-none transition-colors cursor-pointer disabled:opacity-60 ${
                                            grade
                                              ? `${GRADE_CLS[grade]} border-transparent`
                                              : 'text-gray-400 border-gray-200 bg-white hover:border-brand-300'
                                          }`}
                                        >
                                          <option value="">—</option>
                                          {['A', 'B', 'C', 'D'].map(g => (
                                            <option key={g} value={g}>{g}</option>
                                          ))}
                                        </select>
                                        <ChevronDown
                                          size={11}
                                          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-60"
                                        />
                                      </div>
                                      {isSaving && (
                                        <div className="w-3.5 h-3.5 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
