'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard, ClipboardList, MessageSquare,
  BarChart2, Palette, UserPlus, LogOut, Menu, X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import NotificationBell from '@/components/NotificationBell'

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
  { href: '/dashboard/teacher/feedback',     label: 'Feedback',     icon: MessageSquare,   exact: false },
  { href: '/dashboard/teacher/monitoring',   label: 'Monitoring',   icon: BarChart2,       exact: false },
  { href: '/dashboard/teacher/curation',     label: 'Curation',     icon: Palette,         exact: false },
  { href: '/dashboard/teacher/add-students', label: 'Add Students', icon: UserPlus,        exact: false },
]

export default function TeacherSidebar({ teacher }: { teacher: Teacher }) {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const initials = teacher.name
    ? teacher.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'T'

  const sidebarBody = (
    <div className="flex flex-col h-full bg-white">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-brand-green flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-bold text-gray-800 tracking-tight">Kreora</p>
          <p className="text-[10px] font-medium text-brand-pink-dark uppercase tracking-widest mt-0.5">Teacher</p>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell recipientId={teacher.id} recipientType="teacher" />
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-brand-green"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Identity */}
      <div className="px-5 py-4 border-b border-brand-green">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-brand-pink text-brand-pink-dark text-sm font-bold shrink-0">
            {teacher.photo_url
              ? <img src={teacher.photo_url} alt="" className="w-full h-full object-cover" />
              : initials
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{teacher.name}</p>
            <p className="text-xs text-gray-600 truncate">{teacher.subject || teacher.department || 'Teacher'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-pink text-brand-pink-dark font-semibold'
                  : 'text-gray-700 hover:bg-brand-green hover:text-gray-900'
              }`}
            >
              <Icon size={16} className={active ? 'text-brand-pink-dark' : 'text-gray-500'} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-5 border-t border-brand-green pt-3">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-brand-pink hover:text-brand-pink-dark transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 h-full overflow-y-auto bg-white border-r border-brand-green-dark flex-col z-30">
        {sidebarBody}
      </aside>

      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-lg bg-white border border-brand-green-dark text-gray-700 shadow-sm"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-gray-800/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-white border-r border-brand-green-dark flex flex-col">
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  )
}
