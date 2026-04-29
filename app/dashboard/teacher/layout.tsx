import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { redirect } from 'next/navigation'
import TeacherSidebar from './_sidebar'

export default async function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, username, name, grade, class, department, subject, photo_url')
    .eq('id', session.user.id)
    .single()

  if (!teacher) redirect('/login')

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <TeacherSidebar teacher={teacher} />
      <div className="flex-1 min-w-0 bg-[#F8FAF9] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
