'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Users, ClipboardList, FileText, TrendingUp } from 'lucide-react'

interface Student {
  id: string
  nisn: string
  name: string
  grade: string
  class: string
}

interface StudentRow extends Student {
  submitted: number
  lastActive: string | null
}

export default function MonitoringPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ students: 0, submitted: 0, pending: 0, avgGrade: null as number | null })
  const [rows, setRows] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return

    const [{ data: students }, { data: assignments }] = await Promise.all([
      supabase.from('students').select('id, nisn, name, grade, class').eq('teacher_id', user.id),
      supabase.from('assignments').select('id').eq('teacher_id', user.id),
    ])

    const studentList: Student[] = students ?? []
    const assignmentIds = (assignments ?? []).map((a: { id: string }) => a.id)

    if (studentList.length === 0) { setLoading(false); return }

    const nisns = studentList.map(s => s.nisn)

    let submissions: { nisn: string; submitted_at: string; grade: string | null; assignment_id: string }[] = []

    if (assignmentIds.length > 0) {
      const { data: subs } = await supabase
        .from('submissions')
        .select('nisn, submitted_at, grade, assignment_id')
        .in('nisn', nisns)
        .in('assignment_id', assignmentIds)
      submissions = subs ?? []
    }

    const subsByNisn: Record<string, typeof submissions> = {}
    submissions.forEach(s => {
      if (!subsByNisn[s.nisn]) subsByNisn[s.nisn] = []
      subsByNisn[s.nisn].push(s)
    })

    const studentRows: StudentRow[] = studentList.map(st => {
      const subs = subsByNisn[st.nisn] ?? []
      const latestSub = subs.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0]
      return {
        ...st,
        submitted:  subs.length,
        lastActive: latestSub?.submitted_at ?? null,
      }
    })

    const totalSubmitted = submissions.length
    const totalPossible  = studentList.length * assignmentIds.length
    const pending        = Math.max(0, totalPossible - totalSubmitted)

    const numericGrades = submissions
      .map(s => Number(s.grade))
      .filter(n => !isNaN(n) && n >= 0)
    const avgGrade = numericGrades.length > 0
      ? Math.round(numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length)
      : null

    setStats({ students: studentList.length, submitted: totalSubmitted, pending, avgGrade })
    setRows(studentRows.sort((a, b) => b.submitted - a.submitted))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const STAT_CARDS = [
    { label: 'Total Students',       value: stats.students,                       icon: Users,          color: 'text-[#337357]', bg: 'bg-[#337357]/10' },
    { label: 'Submitted',            value: stats.submitted,                      icon: FileText,       color: 'text-blue-600',  bg: 'bg-blue-50'      },
    { label: 'Pending',              value: stats.pending,                        icon: ClipboardList,  color: 'text-amber-600', bg: 'bg-amber-50'     },
    { label: 'Average Grade',        value: stats.avgGrade !== null ? stats.avgGrade : '—', icon: TrendingUp, color: 'text-[#337357]', bg: 'bg-[#337357]/10' },
  ]

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-8 pl-4 border-l-4 border-[#337357]">
        <h1 className="text-2xl font-bold text-[#1a2e25]">Monitoring</h1>
        <p className="text-sm text-[#5a7a6a] mt-0.5">Track student activity and submission progress</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-[#E5EDE9] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            <p className="text-2xl font-bold text-[#1a2e25]">{value}</p>
            <p className="text-xs text-[#5a7a6a] mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="bg-white border border-[#E5EDE9] rounded-xl shadow-sm overflow-hidden animate-pulse">
          <div className="h-10 bg-[#F8FAF9] border-b border-[#E5EDE9]" />
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 border-b border-[#E5EDE9]" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-[#E5EDE9] rounded-xl shadow-sm p-8 text-center">
          <p className="font-semibold text-[#1a2e25]">No students yet.</p>
          <p className="text-sm text-[#5a7a6a] mt-1">Add students from the Add Students page.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E5EDE9] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E5EDE9] bg-[#F8FAF9]">
            <h2 className="font-semibold text-[#1a2e25] text-sm">Student Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5EDE9] text-xs text-[#5a7a6a] font-semibold uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">NISN</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Grade</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Class</th>
                  <th className="text-left px-4 py-3">Submitted</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EDE9]">
                {rows.map(st => (
                  <tr key={st.nisn} className="hover:bg-[#F8FAF9] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
                        >
                          {st.name[0]?.toUpperCase() ?? '?'}
                        </div>
                        <span className="font-medium text-[#1a2e25]">{st.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-[#5a7a6a]">{st.nisn}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-[#5a7a6a]">{st.grade}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-[#5a7a6a]">{st.class}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        st.submitted > 0
                          ? 'bg-[#337357]/10 text-[#337357]'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {st.submitted} submission{st.submitted !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-[#5a7a6a] text-xs">
                      {st.lastActive ? fmtDate(st.lastActive) : 'No activity'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
