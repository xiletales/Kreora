import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import StudentSidebar, { type StudentSession } from '@/components/StudentSidebar'

export default async function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const raw = cookieStore.get('kreora_student_session')?.value

  if (!raw) redirect('/login')

  let session: StudentSession
  try {
    session = JSON.parse(raw) as StudentSession
    if (!session?.nisn) redirect('/login')
  } catch {
    redirect('/login')
  }

  return (
    <div className="flex">
      <StudentSidebar session={session} />
      <div className="flex-1 min-w-0 min-h-[calc(100vh-4rem)]">
        {children}
      </div>
    </div>
  )
}
