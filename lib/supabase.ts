import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'student' | 'teacher'

export interface Profile {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  nisn?: string
  phone?: string
  role: UserRole
  grade?: string
  class?: string
  department?: string
  subject_specialization?: string
  bio?: string
  avatar_url?: string
  created_at: string
}

export interface Artwork {
  id: string
  title: string
  category: string
  status: 'published' | 'in_progress' | 'pending'
  description?: string
  image_url: string
  likes: number
  creator_id: string
  profiles?: Profile
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: string
  title: string
  category: string
  deadline: string
  description?: string
  status: 'video' | 'visual' | 'project'
  teacher_id: string
  created_at: string
}

export interface Badge {
  id: string
  name: string
  description: string
  icon_url?: string
  earned_at: string
  user_id: string
}

export interface Event {
  id: string
  title: string
  date: string
  description?: string
  image_url?: string
  teacher_id: string
  created_at: string
}
