'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useState, useEffect } from 'react'
import { Menu, X, Search, ChevronDown, LayoutDashboard } from 'lucide-react'

const NAV_BASE = [
  { href: '/',          label: 'Home' },
  { href: '/about',     label: 'About' },
  { href: '/gallery',   label: 'Gallery' },
  { href: '/portfolio', label: 'Portfolio' },
]

export default function Navbar() {
  const pathname = usePathname()
  const { user, role, teacherProfile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const NAV = role === 'teacher'
    ? [...NAV_BASE, { href: '/dashboard/teacher', label: 'Dashboard' }]
    : NAV_BASE

  const displayName = teacherProfile?.name?.split(' ')[0] ?? 'Profile'
  const initials = teacherProfile?.name
    ? teacherProfile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email?.[0] ?? 'U').toUpperCase()

  return (
    <motion.header
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 1.45, ease: [0.22, 1, 0.36, 1] }}
      className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${scrolled ? 'shadow-[0_1px_0_0_#F3F4F6,0_4px_16px_rgba(0,0,0,0.06)]' : 'border-b border-gray-100'}`}
    >
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group mr-2">
          <span className="font-display text-[1.2rem] font-bold text-gray-900 tracking-tight">Kreora</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV.map(link => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${active ? 'text-gray-900 bg-gray-50 active' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Search bar – desktop */}
        <div className="hidden md:flex items-center flex-1 max-w-xs">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search artworks, creators..."
              className="w-full pl-8 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full outline-none focus:bg-white focus:border-[#EA9AB2] focus:shadow-[0_0_0_3px_rgba(234,154,178,0.2)] transition-all placeholder-gray-400"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-2 shrink-0 ml-2">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
                >
                  {teacherProfile?.photo_url
                    ? <img src={teacherProfile.photo_url} alt="" className="w-full h-full object-cover" />
                    : initials
                  }
                </div>
                <span className="text-sm font-semibold text-gray-700 max-w-[80px] truncate">{displayName}</span>
                <ChevronDown size={13} className="text-gray-400" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-gray-100 shadow-lg shadow-gray-200/60 overflow-hidden py-1"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <Link href="/dashboard/teacher" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium">
                      <LayoutDashboard size={14} className="text-gray-400" /> Dashboard
                    </Link>
                    <Link href="/portfolio" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">My Portfolio</Link>
                    <Link href="/dashboard/teacher/edit-profile" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Edit Profile</Link>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => { signOut(); setUserMenuOpen(false) }}
                      className="block w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 font-medium"
                    >
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary text-sm py-2 px-4">
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile: search + hamburger */}
        <div className="md:hidden flex items-center gap-1 ml-auto">
          <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
            <Search size={18} />
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            aria-label="Menu"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={menuOpen ? 'x' : 'menu'} initial={{ opacity: 0, rotate: -80 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile search */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            className="md:hidden overflow-hidden border-t border-gray-100"
          >
            <div className="px-4 py-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" placeholder="Search artworks, creators..."
                  autoFocus
                  className="w-full pl-8 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-full outline-none focus:bg-white focus:border-[#EA9AB2] transition-all"
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden border-t border-gray-100 bg-white"
          >
            <div className="px-4 pt-3 pb-4 flex flex-col gap-0.5">
              {NAV.map((link, i) => (
                <motion.div key={link.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${pathname === link.href ? 'bg-[#337357]/10 text-[#337357] font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-3">
                {user ? (
                  <div className="flex items-center justify-between px-2">
                    <Link href="/dashboard/teacher" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}>
                        {initials}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{displayName}</span>
                    </Link>
                    <button onClick={() => { signOut(); setMenuOpen(false) }} className="text-sm text-rose-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-rose-50">Sign out</button>
                  </div>
                ) : (
                  <div className="flex gap-2 px-2">
                    <Link href="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Log in</Link>
                    <Link href="/signup" onClick={() => setMenuOpen(false)} className="flex-1 btn-primary text-sm py-2.5">Sign up</Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
