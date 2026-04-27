import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { redirect } from 'next/navigation'
import TeacherSidebar from '@/components/TeacherSidebar'

export default async function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, username, name, grade, class, department, subject, photo_url')
    .eq('id', session.user.id)
    .single()

  if (!teacher) redirect('/login')

  return (
    <div className="flex">
      <TeacherSidebar teacher={teacher} />
      <div className="flex-1 min-w-0 min-h-[calc(100vh-4rem)]">
        {children}
      </div>
    </div>
  )
}
