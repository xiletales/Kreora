import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import StudentSidebar, { type StudentSession } from '@/components/StudentSidebar'

export default async function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
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
    <div className="flex h-screen overflow-hidden bg-brand-off-white" suppressHydrationWarning>
      <StudentSidebar session={session} />
      <main className="flex-1 h-full w-full overflow-y-auto bg-brand-off-white">
        {children}
      </main>
    </div>
  )
}