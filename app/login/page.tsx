'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Eye, EyeOff, GraduationCap, BookOpen } from 'lucide-react'

type Role = 'student' | 'teacher'

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>('student')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!identifier.trim() || !password) { toast.error('Fill in all fields'); return }
    setLoading(true)

    // ── Step 1: look up email from profiles ───────────────────────────────────
    // (requires the "Public read profiles for login" RLS policy — see README)
    let email = ''

    if (role === 'student') {
      const { data } = await supabase
        .from('profiles')
        .select('email')
        .eq('nisn', identifier.trim())
        .maybeSingle()

      if (!data?.email) {
        toast.error('Student account not found. Check your NISN or contact your teacher.')
        setLoading(false)
        return
      }
      email = data.email
    } else {
      const { data } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', identifier.trim())
        .maybeSingle()

      if (!data?.email) {
        toast.error('Teacher account not found. Check your username.')
        setLoading(false)
        return
      }
      email = data.email
    }

    // ── Step 2: authenticate ──────────────────────────────────────────────────
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error('Incorrect password. Please try again.')
      setLoading(false)
      return
    }

    // ── Step 3: fresh profile fetch to get correct role for redirect ──────────
    // This uses the now-authenticated session so it bypasses anon RLS.
    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    toast.success('Welcome back!')

    if (freshProfile?.role === 'teacher') {
      router.push('/dashboard?tab=assignments')
    } else {
      router.push('/dashboard?tab=assignment')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl shadow-rose-100 border border-rose-100 p-8"
        >
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-bold text-gray-900">Kreora</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Log in to your account</p>
          </div>

          {/* Role selector */}
          <div className="flex rounded-xl border border-gray-200 p-1 mb-6 gap-1">
            {(['student', 'teacher'] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); setIdentifier(''); setPassword('') }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  role === r
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r === 'student' ? <GraduationCap size={15} /> : <BookOpen size={15} />}
                {r === 'student' ? 'Student' : 'Teacher'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  {role === 'student' ? 'NISN' : 'Username'}
                </label>
                <input
                  className="kreora-input"
                  type="text"
                  placeholder={role === 'student' ? 'Enter your NISN' : 'Enter your username'}
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Password</label>
                <div className="relative">
                  <input
                    className="kreora-input pr-10"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {role === 'student' && (
                  <p className="text-xs text-gray-400 mt-1">Default password is your NISN</p>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleLogin}
                disabled={loading}
                className="btn-primary w-full disabled:opacity-60"
              >
                {loading ? 'Logging in...' : 'Log In'}
              </motion.button>

              {role === 'teacher' && (
                <p className="text-center text-xs text-gray-400">
                  New teacher?{' '}
                  <Link href="/signup" className="text-brand-500 font-medium hover:underline">
                    Sign up
                  </Link>
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <p className="text-center text-xs text-gray-400 mt-6">© 2026 Kreora. All rights reserved.</p>
      </div>
    </div>
  )
}
