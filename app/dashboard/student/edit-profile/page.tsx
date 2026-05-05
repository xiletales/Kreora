import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import EditProfileClient from './EditProfileClient'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function StudentEditProfilePage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('kreora_student_session')?.value
  if (!raw) redirect('/login')

  const session = JSON.parse(raw)
  const { nisn } = session

  const { data: student } = await getAdmin()
    .from('students')
    .select('nisn, name, grade, class, department, display_name, bio, photo_url')
    .eq('nisn', nisn)
    .single()

  if (!student) redirect('/login')

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-6 pb-10">
      <div className="mb-8">
        <p className="text-xs font-semibold text-brand-pink-dark uppercase tracking-widest mb-1">Student Dashboard</p>
        <h1 className="font-display text-2xl font-bold text-gray-800">Edit Profile</h1>
      </div>

      <EditProfileClient
        nisn={student.nisn}
        name={student.name}
        grade={student.grade ?? ''}
        studentClass={student.class ?? ''}
        department={student.department ?? ''}
        displayName={student.display_name ?? ''}
        bio={student.bio ?? ''}
        photoUrl={student.photo_url ?? null}
      />
    </div>
  )
}
