'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  ClipboardList, Star, MessageSquare, BarChart2,
  Award, UserPlus, Settings, LogOut,
} from 'lucide-react'

export interface Teacher {
  id: string
  username: string
  name: string
  grade?: string | null
  class?: string | null
  department?: string | null
  subject?: string | null
  photo_url?: string | null
}

const NAV = [
  { href: '/dashboard/teacher/assignment',   label: 'Tugas',          icon: ClipboardList },
  { href: '/dashboard/teacher/grade',         label: 'Penilaian',      icon: Star },
  { href: '/dashboard/teacher/feedback',      label: 'Feedback',       icon: MessageSquare },
  { href: '/dashboard/teacher/monitoring',    label: 'Monitoring',     icon: BarChart2 },
  { href: '/dashboard/teacher/curation',      label: 'Kurasi',         icon: Award },
  { href: '/dashboard/teacher/add-students',  label: 'Tambah Siswa',   icon: UserPlus },
  { href: '/dashboard/teacher/edit-profile',  label: 'Edit Profil',    icon: Settings },
]

export default function TeacherSidebar({ teacher }: { teacher: Teacher }) {
  const pathname = usePathname()
  const { signOut } = useAuth()

  const initials = teacher.name
    ? teacher.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'T'

  return (
    <aside className="w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto bg-white border-r border-gray-100 flex flex-col z-30">

      {/* Teacher identity */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
          >
            {teacher.photo_url
              ? <img src={teacher.photo_url} alt="" className="w-full h-full object-cover" />
              : initials
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{teacher.name || teacher.username}</p>
            <p className="text-xs text-gray-400 truncate">
              {teacher.department || 'Guru'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-brand-50 text-brand-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon
                size={16}
                className={active ? 'text-brand-500' : 'text-gray-400'}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-5 border-t border-gray-100 pt-3">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-50 transition-colors"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>
    </aside>
  )
}
