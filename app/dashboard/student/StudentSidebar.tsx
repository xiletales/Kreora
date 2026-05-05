'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Image, TrendingUp, Award, User, Settings, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'

const NAV = [
  { href: '/dashboard/student', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/student/assignments', label: 'Assignments', icon: ClipboardList },
  { href: '/dashboard/student/showcase', label: 'Showcase', icon: Image },
  { href: '/dashboard/student/portfolio', label: 'My Portfolio', icon: User },
  { href: '/dashboard/student/progress', label: 'Progress', icon: TrendingUp },
  { href: '/dashboard/student/badges', label: 'Badges', icon: Award },
  { href: '/dashboard/student/edit-profile', label: 'Edit Profile', icon: Settings },
]

export default function StudentSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)

  useEffect(() => {
    fetch('/api/auth/student-session')
      .then(r => r.json())
      .then(({ student }) => { if (student) setStudent(student) })
  }, [])

  async function handleSignOut() {
    await fetch('/api/auth/student-logout', { method: 'DELETE' })
    router.push('/')
  }

  return (
    <div className="w-56 shrink-0 h-full flex flex-col overflow-y-auto" style={{ background: '#E27396' }}>
      {/* Student info */}
      <div className="p-5 border-b border-white/20">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg mb-2">
          {student?.name?.[0]?.toUpperCase() || 'S'}
        </div>
        <p className="text-white font-semibold text-sm truncate">{student?.name || 'Student'}</p>
        <p className="text-white/70 text-xs">Class {student?.grade} {student?.class}</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-white/20">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all w-full"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  )
}