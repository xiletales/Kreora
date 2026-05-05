'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard, ClipboardList, Star, MessageSquare,
  BarChart2, Palette, UserPlus, LogOut, Menu, X,
} from 'lucide-react'
import { useState } from 'react'

interface Teacher {
  id: string
  username: string
  name: string
  grade: string | null
  class: string | null
  department: string | null
  subject: string | null
  photo_url: string | null
}

const NAV = [
  { href: '/dashboard/teacher',              label: 'Overview',     icon: LayoutDashboard, exact: true  },
  { href: '/dashboard/teacher/assignments',  label: 'Assignments',  icon: ClipboardList,   exact: false },
  { href: '/dashboard/teacher/grades',       label: 'Grades',       icon: Star,            exact: false },
  { href: '/dashboard/teacher/feedback',     label: 'Feedback',     icon: MessageSquare,   exact: false },
  { href: '/dashboard/teacher/monitoring',   label: 'Monitoring',   icon: BarChart2,       exact: false },
  { href: '/dashboard/teacher/curation',     label: 'Curation',     icon: Palette,         exact: false },
  { href: '/dashboard/teacher/students/add', label: 'Add Students', icon: UserPlus,        exact: false },
]

export default function TeacherSidebar({ teacher }: { teacher: Teacher }) {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials = teacher.name
    ? teacher.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'T'

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#1a2e25]">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #337357, #285e46)', border: '2px solid rgba(255,255,255,0.15)' }}
          >
            {teacher.photo_url
              ? <img src={teacher.photo_url} alt="" className="w-full h-full object-cover" />
              : initials
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{teacher.name}</p>
            <p className="text-xs text-white/50 truncate">{teacher.subject || teacher.department || 'Teacher'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-[#337357] text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={16} className={active ? 'text-white' : 'text-white/50'} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-5 border-t border-white/10 pt-3">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors"
        >
          <LogOut size={16} className="text-white/40" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex w-60 shrink-0 h-full overflow-y-auto bg-[#1a2e25] flex-col z-30">
        {sidebarContent}
      </aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 w-12 h-12 bg-[#337357] text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-[#1a2e25]/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-[#1a2e25] flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
            >
              <X size={18} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
