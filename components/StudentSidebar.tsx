'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, ClipboardList, ImageIcon, TrendingUp, Award, Settings, LogOut } from 'lucide-react'

export interface StudentSession {
  nisn: string
  name: string
  grade: string
  class: string
  department: string
  photo_url: string | null
}

const NAV = [
  { href: '/dashboard/student',             label: 'Beranda',    icon: Home,          exact: true },
  { href: '/dashboard/student/assignment',  label: 'Tugas',      icon: ClipboardList, exact: false },
  { href: '/dashboard/student/showcase',    label: 'Showcase',   icon: ImageIcon,     exact: false },
  { href: '/dashboard/student/progress',    label: 'Progress',   icon: TrendingUp,    exact: false },
  { href: '/dashboard/student/badges',      label: 'Badge',      icon: Award,         exact: false },
  { href: '/dashboard/student/edit-profile',label: 'Edit Profil',icon: Settings,      exact: false },
]

export default function StudentSidebar({ session }: { session: StudentSession }) {
  const pathname = usePathname()
  const router = useRouter()

  const initials = session.name
    ? session.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'S'

  async function handleLogout() {
    await fetch('/api/auth/student-logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto bg-white border-r border-gray-100 flex flex-col z-30">

      {/* Student identity */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
          >
            {session.photo_url
              ? <img src={session.photo_url} alt="" className="w-full h-full object-cover" />
              : initials
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{session.name}</p>
            <p className="text-xs text-gray-400 truncate">
              Kelas {session.grade} {session.class}
              {session.department ? ` · ${session.department}` : ''}
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
                  ? 'bg-brand-50 text-brand-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} className={active ? 'text-brand-500' : 'text-gray-400'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 border-t border-gray-100 pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-50 transition-colors"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>
    </aside>
  )
}
