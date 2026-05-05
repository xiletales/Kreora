'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Image as ImageIcon, TrendingUp, Award, User, Settings, LogOut } from 'lucide-react'

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

  const initials = session.name
    ? session.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'S'

  async function handleLogout() {
    await fetch('/api/auth/student-logout', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <aside className="w-56 shrink-0 h-full overflow-y-auto bg-[#E27396] flex flex-col">

      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/15">
        <p className="font-display text-lg font-bold text-white tracking-tight">Kreora</p>
        <p className="text-[10px] font-medium text-white/70 uppercase tracking-widest mt-0.5">Student</p>
      </div>

      {/* Identity */}
      <div className="px-5 py-4 border-b border-white/15">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden bg-white/20"
          >
            {session.photo_url
              ? <img src={session.photo_url} alt="" className="w-full h-full object-cover" />
              : initials
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{session.name}</p>
            <p className="text-xs text-white/70 truncate">
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-[#337357] text-white font-semibold shadow-sm'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={16} className={active ? 'text-white' : 'text-white/80'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 border-t border-white/15 pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
