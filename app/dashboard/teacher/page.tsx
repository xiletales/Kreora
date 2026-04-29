import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { redirect } from 'next/navigation'
import { Users, ClipboardList, FileText, MessageSquare } from 'lucide-react'

const getAdmin = () => {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function TeacherOverviewPage() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const tid = session.user.id
  const admin = getAdmin()

  const [
    { count: studentCount },
    { count: assignmentCount },
    { data: rawAssignments },
  ] = await Promise.all([
    admin.from('students').select('id', { count: 'exact', head: true }).eq('teacher_id', tid),
    admin.from('assignments').select('id', { count: 'exact', head: true }).eq('teacher_id', tid),
    admin.from('assignments').select('id, title, category, deadline').eq('teacher_id', tid).order('created_at', { ascending: false }).limit(5),
  ])

  const assignments = rawAssignments ?? []
  const assignmentIds = assignments.map((a: { id: string }) => a.id)
  let submissionCount = 0
  let feedbackCount = 0

  if (assignmentIds.length > 0) {
    const [{ count: sc }, { count: fc }] = await Promise.all([
      admin.from('submissions').select('id', { count: 'exact', head: true }).in('assignment_id', assignmentIds),
      admin.from('feedbacks').select('id', { count: 'exact', head: true }).eq('teacher_id', tid),
    ])
    submissionCount = sc ?? 0
    feedbackCount = fc ?? 0
  }

  const { data: teacherRow } = await admin.from('teachers').select('name, subject, grade').eq('id', tid).single()
  const firstName = teacherRow?.name?.split(' ')[0] ?? 'Teacher'

  const STATS = [
    { label: 'Total Students',    value: studentCount ?? 0,   icon: Users,          color: 'text-[#337357]', bg: 'bg-[#337357]/10' },
    { label: 'Assignments',       value: assignmentCount ?? 0, icon: ClipboardList,  color: 'text-blue-600',  bg: 'bg-blue-50'      },
    { label: 'Submissions',       value: submissionCount,      icon: FileText,       color: 'text-amber-600', bg: 'bg-amber-50'     },
    { label: 'Feedback Given',    value: feedbackCount,        icon: MessageSquare,  color: 'text-rose-500',  bg: 'bg-rose-50'      },
  ]

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto">
      <div className="mb-8 pl-4 border-l-4 border-[#337357]">
        <h1 className="text-2xl font-bold text-[#1a2e25]">Welcome back, {firstName}</h1>
        <p className="text-sm text-[#5a7a6a] mt-0.5">
          {teacherRow?.subject ? `${teacherRow.subject}` : 'Teacher Dashboard'}
          {teacherRow?.grade ? ` · Grade ${teacherRow.grade}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-[#E5EDE9] rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-4`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-[#1a2e25]">{value}</p>
            <p className="text-sm text-[#5a7a6a] mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E5EDE9] rounded-xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1a2e25] mb-4">Recent Assignments</h2>

        {assignments.length === 0 ? (
          <p className="text-sm text-[#5a7a6a]">No assignments yet. Go to Assignments to create your first one.</p>
        ) : (
          <div className="space-y-3">
            {assignments.map((a: { id: string; title: string; category: string; deadline: string }) => {
              const diff = new Date(a.deadline).getTime() - Date.now()
              const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
              const badge = diff < 0
                ? { label: 'Past due', cls: 'bg-rose-100 text-rose-600' }
                : days <= 3
                ? { label: `${days}d left`, cls: 'bg-amber-100 text-amber-700' }
                : { label: 'Active', cls: 'bg-[#337357]/10 text-[#337357]' }

              return (
                <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-[#E5EDE9] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a2e25] truncate">{a.title}</p>
                    <p className="text-xs text-[#5a7a6a] mt-0.5">
                      {a.category} · Due {new Date(a.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
