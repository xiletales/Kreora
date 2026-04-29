'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Star, Download } from 'lucide-react'
import toast from 'react-hot-toast'

interface GradeRow {
  submissionId: string
  studentName: string
  nisn: string
  assignmentTitle: string
  submittedAt: string
  fileUrl: string | null
  grade: string
  gradeStatus: 'graded' | 'pending'
}

export default function GradesPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<GradeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!user) return

    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title')
      .eq('teacher_id', user.id)

    if (!assignments || assignments.length === 0) { setLoading(false); return }

    const assignmentMap = Object.fromEntries(assignments.map(a => [a.id, a.title]))
    const assignmentIds = assignments.map(a => a.id)

    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, assignment_id, nisn, file_url, submitted_at, grade, students(nisn, name)')
      .in('assignment_id', assignmentIds)
      .order('submitted_at', { ascending: false })

    if (error) { toast.error('Failed to load grades.'); setLoading(false); return }

    const built: GradeRow[] = (submissions ?? []).map((s: any) => {
      const student = Array.isArray(s.students) ? s.students[0] : s.students
      const gradeVal = s.grade ?? ''
      return {
        submissionId:    s.id,
        studentName:     student?.name ?? 'Unknown',
        nisn:            student?.nisn ?? s.nisn ?? '—',
        assignmentTitle: assignmentMap[s.assignment_id] ?? '—',
        submittedAt:     s.submitted_at,
        fileUrl:         s.file_url,
        grade:           gradeVal,
        gradeStatus:     gradeVal ? 'graded' : 'pending',
      }
    })

    setRows(built)
    const initInputs: Record<string, string> = {}
    built.forEach(r => { initInputs[r.submissionId] = r.grade })
    setGradeInputs(initInputs)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function saveGrade(submissionId: string) {
    const raw = gradeInputs[submissionId] ?? ''
    const num = Number(raw)
    if (raw !== '' && (isNaN(num) || num < 0 || num > 100)) {
      toast.error('Grade must be a number between 0 and 100.')
      return
    }
    setSaving(prev => new Set(prev).add(submissionId))
    const { error } = await supabase
      .from('submissions')
      .update({ grade: raw === '' ? null : String(Math.round(num)) })
      .eq('id', submissionId)
    setSaving(prev => { const n = new Set(prev); n.delete(submissionId); return n })
    if (error) { toast.error('Failed to save grade.'); return }
    setRows(prev => prev.map(r =>
      r.submissionId === submissionId
        ? { ...r, grade: raw, gradeStatus: raw ? 'graded' : 'pending' }
        : r
    ))
    toast.success('Grade saved.')
  }

  const gradedCount = rows.filter(r => r.grade).length

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-8 pl-4 border-l-4 border-[#337357]">
        <h1 className="text-2xl font-bold text-[#1a2e25]">Grades</h1>
        <p className="text-sm text-[#5a7a6a] mt-0.5">
          {loading ? '' : `${gradedCount} of ${rows.length} submissions graded`}
        </p>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E5EDE9] rounded-xl shadow-sm overflow-hidden animate-pulse">
          <div className="h-10 bg-[#F8FAF9] border-b border-[#E5EDE9]" />
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 border-b border-[#E5EDE9]" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-24 bg-white border border-[#E5EDE9] rounded-xl shadow-sm">
          <div className="w-12 h-12 bg-[#F8FAF9] rounded-xl flex items-center justify-center mx-auto mb-3">
            <Star size={20} className="text-[#5a7a6a]" />
          </div>
          <p className="font-semibold text-[#1a2e25]">No submissions to grade yet.</p>
          <p className="text-sm text-[#5a7a6a] mt-1">Grades will appear here once students submit work.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E5EDE9] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8FAF9] border-b border-[#E5EDE9] text-xs text-[#5a7a6a] font-semibold uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Student</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">NISN</th>
                  <th className="text-left px-4 py-3">Assignment</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Submitted</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">File</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Grade (0–100)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EDE9]">
                {rows.map(row => {
                  const isSaving = saving.has(row.submissionId)
                  return (
                    <tr key={row.submissionId} className="hover:bg-[#F8FAF9] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
                          >
                            {row.studentName[0]?.toUpperCase() ?? '?'}
                          </div>
                          <span className="font-medium text-[#1a2e25]">{row.studentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-[#5a7a6a]">{row.nisn}</td>
                      <td className="px-4 py-3 text-[#1a2e25] max-w-[160px] truncate">{row.assignmentTitle}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-[#5a7a6a] text-xs">
                        {new Date(row.submittedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {row.fileUrl ? (
                          <a href={row.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#337357] hover:text-[#285e46] font-medium text-xs">
                            <Download size={12} /> Download
                          </a>
                        ) : <span className="text-[#5a7a6a]/40 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                          row.gradeStatus === 'graded'
                            ? 'bg-[#337357]/10 text-[#337357]'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {row.gradeStatus === 'graded' ? 'Graded' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="w-16 text-sm font-medium text-[#1a2e25] bg-[#F8FAF9] border border-[#E5EDE9] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#337357] focus:bg-white transition-colors"
                            value={gradeInputs[row.submissionId] ?? ''}
                            onChange={e => setGradeInputs(prev => ({ ...prev, [row.submissionId]: e.target.value }))}
                            onBlur={() => saveGrade(row.submissionId)}
                            onKeyDown={e => e.key === 'Enter' && saveGrade(row.submissionId)}
                            placeholder="—"
                            disabled={isSaving}
                          />
                          {isSaving && <div className="w-3.5 h-3.5 border-2 border-[#337357]/30 border-t-[#337357] rounded-full animate-spin" />}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
