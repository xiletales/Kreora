'use client'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Palette } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!identifier || !password) { toast.error('Fill in all fields'); return }
    setLoading(true)

    // Look up by username (teacher) first, then NISN (student)
    let profileData: { email: string; role: string } | null = null

    const { data: byUsername } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('username', identifier)
      .maybeSingle()

    if (byUsername) {
      profileData = byUsername
    } else {
      const { data: byNisn } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('nisn', identifier)
        .maybeSingle()
      if (byNisn) profileData = byNisn
    }

    if (!profileData?.email) {
      toast.error('Account not found')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: profileData.email,
      password,
    })

    setLoading(false)
    if (error) { toast.error(error.message); return }

    toast.success('Welcome back!')
    if (profileData.role === 'teacher') {
      router.push('/dashboard?tab=assignments')
    } else {
      router.push('/dashboard?tab=artworks')
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
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md" style={{ background: 'linear-gradient(135deg, #337357 0%, #285e46 100%)' }}>
              <Palette size={22} className="text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-rose-600">Kreora</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Log in to your account</p>
            <p className="text-xs text-gray-400 mt-1">
              New teacher?{' '}
              <Link href="/signup" className="text-rose-500 font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Username or NISN
              </label>
              <input
                className="kreora-input"
                type="text"
                placeholder="Enter your username or NISN"
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
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-right mt-1">
                <span className="text-xs text-rose-400 cursor-pointer hover:underline">
                  Forgot password?
                </span>
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleLogin}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-60"
            >
              {loading ? 'Logging in...' : 'Continue'}
            </motion.button>
          </div>
        </motion.div>

        <p className="text-center text-xs text-gray-400 mt-6">© 2024 All rights reserved</p>
      </div>
    </div>
  )
}
