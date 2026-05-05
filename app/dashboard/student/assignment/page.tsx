import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import AssignmentClient from './AssignmentClient'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function StudentAssignmentPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('kreora_student_session')?.value
  if (!raw) redirect('/login')

  const session = JSON.parse(raw)
  const { nisn } = session

  const { data: student } = await getAdmin()
    .from('students')
    .select('added_by')
    .eq('nisn', nisn)
    .single()

  if (!student) redirect('/login')

  const [{ data: rawAssignments }, { data: rawSubmissions }] = await Promise.all([
    getAdmin()
      .from('assignments')
      .select('id, title, deadline, category, description')
      .eq('teacher_id', student.added_by)
      .order('created_at', { ascending: false }),
    getAdmin()
      .from('submissions')
      .select('assignment_id, file_url, grade')
      .eq('nisn', nisn),
  ])

  const assignments = rawAssignments ?? []
  const submissions = rawSubmissions ?? []

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-6 pb-10">
      <div className="mb-8">
        <p className="text-xs font-semibold text-[#E27396] uppercase tracking-widest mb-1">Student Dashboard</p>
        <h1 className="font-display text-2xl font-bold text-[#1a2e25]">Assignments</h1>
      </div>

      <AssignmentClient assignments={assignments} submissions={submissions} />
    </div>
  )
}