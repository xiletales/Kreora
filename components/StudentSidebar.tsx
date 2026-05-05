'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  ClipboardList,
  Image as ImageIcon,
  TrendingUp,
  Award,
  User,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

export interface StudentSession {
  nisn: string
  name: string
  grade: string
  class: string
  department: string
  photo_url: string | null
}

const NAV = [
  { href: '/dashboard/student',              label: 'Home',         icon: LayoutDashboard, exact: true  },
  { href: '/dashboard/student/assignments',  label: 'Assignments',  icon: ClipboardList,   exact: false },
  { href: '/dashboard/student/showcase',     label: 'Showcase',     icon: ImageIcon,       exact: false },
  { href: '/dashboard/student/progress',     label: 'Progress',     icon: TrendingUp,      exact: false },
  { href: '/dashboard/student/badges',       label: 'Badges',       icon: Award,           exact: false },
  { href: '/dashboard/student/portfolio',    label: 'My Portfolio', icon: User,            exact: false },
  { href: '/dashboard/student/edit-profile', label: 'Edit Profile', icon: Settings,        exact: false },
]

export default function StudentSidebar({ session }: { session: StudentSession }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])

  const initials = session.name
    ? session.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'S'

  async function handleLogout() {
    await fetch('/api/auth/student-logout', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 p-2 rounded-lg bg-white border border-brand-green-dark text-gray-700 shadow-sm"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-gray-800/30"
          aria-hidden="true"
        />
      )}

      {/* Sidebar — static on md+, slide-in overlay on mobile */}
      <aside
        className={`
          fixed md:static top-0 left-0 z-50 md:z-auto
          w-60 h-full shrink-0 overflow-y-auto
          bg-white border-r border-brand-green-dark
          flex flex-col
          transform transition-transform duration-200 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b border-brand-green flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-bold text-gray-800 tracking-tight">Kreora</p>
            <p className="text-[10px] font-medium text-brand-pink-dark uppercase tracking-widest mt-0.5">Student</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-brand-green"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Identity */}
        <div className="px-5 py-4 border-b border-brand-green">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-pink text-brand-pink-dark flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
              {session.photo_url
                ? <img src={session.photo_url} alt="" className="w-full h-full object-cover" />
                : initials
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{session.name}</p>
              <p className="text-xs text-gray-600 truncate">
                {session.grade && session.class
                  ? `Grade ${session.grade} ${session.class}${session.department ? ` · ${session.department}` : ''}`
                  : 'Student'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
            return (
              <Link
                key={href}
                href={href}
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

        {/* Logout */}
        <div className="px-3 pb-5 border-t border-brand-green pt-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-brand-pink hover:text-brand-pink-dark transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
