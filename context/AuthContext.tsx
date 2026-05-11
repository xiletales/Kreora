'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface TeacherProfile {
  id: string
  username: string
  name: string
  grade: string | null
  class: string | null
  department: string | null
  subject: string | null
  photo_url: string | null
}

interface AuthContextType {
  user: User | null
  role: 'teacher' | null
  teacherProfile: TeacherProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null, role: null, teacherProfile: null, loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'teacher' | null>(null)
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  async function fetchTeacher(userId: string) {
    const { data } = await supabase
      .from('teachers')
      .select('id, username, name, grade, class, department, subject, photo_url')
      .eq('id', userId)
      .maybeSingle()

    if (data) {
      setTeacherProfile(data as TeacherProfile)
      setRole('teacher')
    } else {
      setTeacherProfile(null)
      setRole(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchTeacher(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchTeacher(session.user.id)
      } else {
        setTeacherProfile(null)
        setRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setTeacherProfile(null)
    setRole(null)
    router.push('/')
  }

  return (
    <AuthContext.Provider value={{ user, role, teacherProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
