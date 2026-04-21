'use client'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Palette } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    grade: '',
    className: '',
    department: '',
    subject: '',
    email: '',
    password: '',
    confirmPassword: '',
    agree: false,
  })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  function update(key: string, val: string | boolean) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit() {
    if (!form.agree) { toast.error('Please agree to the Terms & Conditions'); return }
    if (!form.firstName || !form.username || !form.email || !form.password) {
      toast.error('Please fill all required fields')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          username: form.username,
          role: 'teacher',
          grade: form.grade,
          class: form.className,
          department: form.department,
          subject_specialization: form.subject,
        },
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Upsert profile with all teacher fields
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username: form.username,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        role: 'teacher',
        grade: form.grade,
        class: form.className,
        department: form.department,
        subject_specialization: form.subject,
        created_at: new Date().toISOString(),
      })
    }

    setLoading(false)
    toast.success('Account created! Check your email to verify.')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl shadow-rose-100 border border-rose-100 p-8"
        >
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md" style={{ background: 'linear-gradient(135deg, #337357 0%, #285e46 100%)' }}>
              <Palette size={22} className="text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-rose-600">Kreora</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Teacher Registration</p>
            <p className="text-xs text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-rose-500 font-medium hover:underline">
                Log in
              </Link>
            </p>
          </div>

          <div className="space-y-3">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  className="kreora-input"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={e => update('firstName', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label>
                <input
                  className="kreora-input"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={e => update('lastName', e.target.value)}
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Username <span className="text-rose-500">*</span>
              </label>
              <input
                className="kreora-input"
                placeholder="e.g. bu_sari"
                value={form.username}
                onChange={e => update('username', e.target.value)}
              />
            </div>

            {/* Grade + Class */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Grade Taught</label>
                <select
                  className="kreora-input"
                  value={form.grade}
                  onChange={e => update('grade', e.target.value)}
                >
                  <option value="">Select grade</option>
                  <option value="X">X</option>
                  <option value="XI">XI</option>
                  <option value="XII">XII</option>
                  <option value="X, XI, XII">All grades</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Class</label>
                <select
                  className="kreora-input"
                  value={form.className}
                  onChange={e => update('className', e.target.value)}
                >
                  <option value="">Select class</option>
                  <option value="DKV 1">DKV 1</option>
                  <option value="DKV 2">DKV 2</option>
                  <option value="DKV 3">DKV 3</option>
                  <option value="MM 1">MM 1</option>
                  <option value="MM 2">MM 2</option>
                </select>
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Department</label>
              <input
                className="kreora-input"
                placeholder="e.g. Desain Komunikasi Visual"
                value={form.department}
                onChange={e => update('department', e.target.value)}
              />
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Subject / Specialization
              </label>
              <input
                className="kreora-input"
                placeholder="e.g. Illustration & Poster Design"
                value={form.subject}
                onChange={e => update('subject', e.target.value)}
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Email <span className="text-rose-500">*</span>
              </label>
              <input
                className="kreora-input"
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  className="kreora-input pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  className="kreora-input pr-10"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agree}
                onChange={e => update('agree', e.target.checked)}
                className="mt-0.5 accent-rose-500"
              />
              <span className="text-xs text-gray-500">
                I agree to the{' '}
                <span className="text-rose-500 font-medium">Terms and Conditions</span>
              </span>
            </label>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Register as Teacher'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
