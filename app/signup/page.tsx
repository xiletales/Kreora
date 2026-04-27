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
    name: '',
    username: '',
    grade: '',
    className: '',
    department: '',
    subject: '',
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
    if (!form.agree) { toast.error('Setujui syarat & ketentuan terlebih dahulu.'); return }
    if (!form.name || !form.username || !form.password) {
      toast.error('Nama, username, dan password wajib diisi.')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Password tidak cocok.')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password minimal 6 karakter.')
      return
    }

    const username = form.username.trim().toLowerCase()
    const email = `${username}@kreora.teacher`

    setLoading(true)

    // Step 1: create Supabase Auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password: form.password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      toast.error('Gagal membuat akun. Coba lagi.')
      setLoading(false)
      return
    }

    // Step 2: insert into teachers table
    const { error: insertError } = await supabase.from('teachers').insert({
      id: data.user.id,
      username,
      name: form.name.trim(),
      grade: form.grade || null,
      class: form.className || null,
      department: form.department.trim() || null,
      subject: form.subject.trim() || null,
    })

    setLoading(false)

    if (insertError) {
      toast.error('Akun dibuat tapi data profil gagal disimpan: ' + insertError.message)
      return
    }

    toast.success('Akun berhasil dibuat! Silakan login.')
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
            <h1 className="font-display text-2xl font-bold text-gray-900">Kreora</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Daftar sebagai Guru</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-brand-600 font-medium hover:underline">
                Login
              </Link>
            </p>
          </div>

          <div className="space-y-3">

            {/* Full name */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <input
                className="kreora-input"
                placeholder="Nama lengkap"
                value={form.name}
                onChange={e => update('name', e.target.value)}
              />
            </div>

            {/* Username */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Username <span className="text-rose-500">*</span>
              </label>
              <input
                className="kreora-input"
                placeholder="contoh: bu_sari"
                value={form.username}
                onChange={e => update('username', e.target.value.toLowerCase().replace(/\s/g, '_'))}
              />
              {form.username && (
                <p className="text-xs text-gray-400 mt-1">
                  Login sebagai: <span className="font-medium text-gray-600">{form.username.toLowerCase()}@kreora.teacher</span>
                </p>
              )}
            </div>

            {/* Grade + Class */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Kelas Diajar</label>
                <select
                  className="kreora-input"
                  value={form.grade}
                  onChange={e => update('grade', e.target.value)}
                >
                  <option value="">Pilih kelas</option>
                  <option value="X">X</option>
                  <option value="XI">XI</option>
                  <option value="XII">XII</option>
                  <option value="X, XI, XII">Semua kelas</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Rombel</label>
                <select
                  className="kreora-input"
                  value={form.className}
                  onChange={e => update('className', e.target.value)}
                >
                  <option value="">Pilih rombel</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Jurusan</label>
              <input
                className="kreora-input"
                placeholder="contoh: Desain Komunikasi Visual"
                value={form.department}
                onChange={e => update('department', e.target.value)}
              />
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Mata Pelajaran</label>
              <input
                className="kreora-input"
                placeholder="contoh: Ilustrasi & Desain Poster"
                value={form.subject}
                onChange={e => update('subject', e.target.value)}
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
                  placeholder="Minimal 6 karakter"
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
                Konfirmasi Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  className="kreora-input pr-10"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Ulangi password"
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
                className="mt-0.5 accent-brand-500"
              />
              <span className="text-xs text-gray-500">
                Saya setuju dengan{' '}
                <span className="text-brand-600 font-medium">Syarat & Ketentuan</span>
              </span>
            </label>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-60"
            >
              {loading ? 'Membuat akun...' : 'Daftar sebagai Guru'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
