'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { Camera, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeacherProfile {
  id: string
  username: string
  name: string
  grade: string | null
  class: string | null
  department: string | null
  subject: string | null
  photo_url: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GRADES = ['10', '11', '12']
const CLASSES = ['A', 'B', 'C']

const EMPTY_PASS = { newPassword: '', confirmPassword: '' }

// ── Main component ────────────────────────────────────────────────────────────

export default function EditProfilePage() {
  const { user } = useAuth()
  const router = useRouter()

  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Profile form
  const [form, setForm] = useState({
    username: '',
    name: '',
    grade: '10',
    class: 'A',
    department: '',
    subject: '',
  })

  // Photo upload
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Password section
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASS)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  // ── Load teacher ───────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!user) return
    setError(null)

    const { data, error: err } = await supabase
      .from('teachers')
      .select('id, username, name, grade, class, department, subject, photo_url')
      .eq('id', user.id)
      .single()

    if (err) { setError('Gagal memuat profil.'); setLoading(false); return }

    setTeacher(data as TeacherProfile)
    setForm({
      username: data.username ?? '',
      name: data.name ?? '',
      grade: data.grade ?? '10',
      class: data.class ?? 'A',
      department: data.department ?? '',
      subject: data.subject ?? '',
    })
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // Revoke object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }
  }, [photoPreview])

  // ── Photo selection ────────────────────────────────────────────────────────

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Ukuran foto maksimal 5 MB'); return }
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!user || !teacher) return
    if (!form.username.trim()) { toast.error('Username wajib diisi'); return }
    if (!form.name.trim()) { toast.error('Nama wajib diisi'); return }

    // Password validation (only if section is open and field is filled)
    if (showPasswordSection && passwordForm.newPassword) {
      if (passwordForm.newPassword.length < 6) {
        toast.error('Password minimal 6 karakter')
        return
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('Konfirmasi password tidak cocok')
        return
      }
    }

    setSaving(true)

    // ── 1. Upload photo if changed ─────────────────────────────────────────
    let photoUrl = teacher.photo_url

    if (photoFile) {
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(`teachers/${teacher.id}/avatar.jpg`, photoFile, {
          upsert: true,
          contentType: photoFile.type,
        })

      if (uploadErr) {
        toast.error('Gagal mengunggah foto. Coba lagi.')
        setSaving(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(`teachers/${teacher.id}/avatar.jpg`)

      photoUrl = publicUrl
    }

    // ── 2. Update teachers table ───────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from('teachers')
      .update({
        username:   form.username.trim(),
        name:       form.name.trim(),
        grade:      form.grade,
        class:      form.class,
        department: form.department.trim() || null,
        subject:    form.subject.trim() || null,
        photo_url:  photoUrl,
      })
      .eq('id', teacher.id)

    if (updateErr) {
      if (updateErr.code === '23505') {
        toast.error('Username sudah digunakan. Pilih username lain.')
      } else {
        toast.error('Gagal menyimpan profil')
      }
      setSaving(false)
      return
    }

    // ── 3. Update Supabase Auth email if username changed ──────────────────
    if (form.username.trim() !== teacher.username) {
      const { error: emailErr } = await supabase.auth.updateUser({
        email: `${form.username.trim()}@kreora.teacher`,
      })
      if (emailErr) {
        toast.error('Profil tersimpan, tapi gagal memperbarui email akun.')
        setSaving(false)
        // Don't return — profile data was saved, just the email update failed
      }
    }

    // ── 4. Update password if filled ───────────────────────────────────────
    if (showPasswordSection && passwordForm.newPassword) {
      const { error: passErr } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })
      if (passErr) {
        toast.error('Profil tersimpan, tapi gagal memperbarui password.')
        setSaving(false)
      } else {
        setPasswordForm(EMPTY_PASS)
        setShowPasswordSection(false)
      }
    }

    setSaving(false)
    toast.success('Profil berhasil disimpan!')

    // Refresh the server layout so sidebar picks up new name + photo
    router.refresh()
  }

  // ── Derived UI values ──────────────────────────────────────────────────────

  const avatarSrc = photoPreview ?? teacher?.photo_url ?? null
  const initials = teacher?.name
    ? teacher.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'G'

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 sm:p-8 max-w-2xl">
        <div className="h-7 skeleton w-40 rounded mb-8" />
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 skeleton rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 sm:p-8 max-w-2xl">
        <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-2xl">

      {/* ── Header ── */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Guru Dashboard</p>
        <h1 className="font-display text-2xl font-bold text-gray-900">Edit Profil</h1>
      </div>

      <div className="space-y-6">

        {/* ── Photo section ── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Foto Profil</h2>
          <div className="flex items-center gap-5">
            {/* Avatar preview */}
            <div className="relative shrink-0">
              <div
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white text-xl font-bold shadow-md"
                style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
              >
                {avatarSrc
                  ? <img src={avatarSrc} alt="Foto profil" className="w-full h-full object-cover" />
                  : initials
                }
              </div>
              {/* Camera overlay button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-brand-500 hover:bg-brand-600 flex items-center justify-center shadow-md transition-colors border-2 border-white"
              >
                <Camera size={13} className="text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium text-brand-600 hover:text-brand-700 border border-brand-200 bg-brand-50 px-4 py-2 rounded-lg hover:bg-brand-100 transition-colors"
              >
                {photoFile ? 'Ganti foto' : 'Upload foto'}
              </button>
              <p className="text-xs text-gray-400 mt-1.5">JPG, PNG, atau WebP. Maksimal 5 MB.</p>
              {photoFile && (
                <p className="text-xs text-brand-600 mt-1">{photoFile.name} dipilih</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Account info ── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Informasi Akun</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Username</label>
              <input
                className="kreora-input"
                placeholder="Username untuk login"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              />
              <p className="text-xs text-gray-400 mt-1">
                Login email akan berubah menjadi <span className="font-mono">{form.username || 'username'}@kreora.teacher</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Profile info ── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Informasi Profil</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nama Lengkap</label>
              <input
                className="kreora-input"
                placeholder="Nama guru"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Kelas (Angkatan)</label>
              <select
                className="kreora-input"
                value={form.grade}
                onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
              >
                {GRADES.map(g => <option key={g} value={g}>Kelas {g}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Kelas (Rombel)</label>
              <select
                className="kreora-input"
                value={form.class}
                onChange={e => setForm(f => ({ ...f, class: e.target.value }))}
              >
                {CLASSES.map(c => <option key={c} value={c}>Kelas {c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Departemen <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input
                className="kreora-input"
                placeholder="Contoh: DKV"
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Mata Pelajaran <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input
                className="kreora-input"
                placeholder="Contoh: Desain Komunikasi Visual"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* ── Password section ── */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPasswordSection(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div>
              <p className="text-sm font-semibold text-gray-700">Ganti Password</p>
              <p className="text-xs text-gray-400 mt-0.5">Kosongkan jika tidak ingin mengganti password</p>
            </div>
            {showPasswordSection
              ? <ChevronUp size={16} className="text-gray-400 shrink-0" />
              : <ChevronDown size={16} className="text-gray-400 shrink-0" />
            }
          </button>

          {showPasswordSection && (
            <div className="px-6 pb-6 border-t border-gray-50 pt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Password Baru</label>
                <div className="relative">
                  <input
                    className="kreora-input pr-10"
                    type={showNewPass ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Konfirmasi Password Baru</label>
                <div className="relative">
                  <input
                    className="kreora-input pr-10"
                    type={showConfirmPass ? 'text' : 'password'}
                    placeholder="Ulangi password baru"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {passwordForm.newPassword && passwordForm.confirmPassword &&
                  passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="text-xs text-rose-500 mt-1">Password tidak cocok</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Save button ── */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 text-sm font-semibold bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-60 transition-colors shadow-sm shadow-brand-200"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  )
}
