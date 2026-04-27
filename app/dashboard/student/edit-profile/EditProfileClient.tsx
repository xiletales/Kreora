'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Check } from 'lucide-react'

interface Props {
  nisn: string
  name: string
  grade: string
  studentClass: string
  department: string
  displayName: string
  bio: string
  photoUrl: string | null
}

export default function EditProfileClient({
  nisn, name, grade, studentClass, department,
  displayName: initialDisplayName,
  bio: initialBio,
  photoUrl: initialPhotoUrl,
}: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [bio, setBio] = useState(initialBio)
  const [preview, setPreview] = useState<string | null>(initialPhotoUrl)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'S'

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    const form = new FormData()
    form.append('display_name', displayName)
    form.append('bio', bio)
    if (file) form.append('avatar', file)

    const res = await fetch('/api/student/update-profile', { method: 'PATCH', body: form })
    const json = await res.json()

    setSaving(false)
    if (!res.ok) { setError(json.error ?? 'Gagal menyimpan.'); return }

    setSaved(true)
    setFile(null)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-lg">

      {/* Avatar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-5">Foto Profil</h2>
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white text-xl font-bold"
              style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
            >
              {preview
                ? <img src={preview} alt="" className="w-full h-full object-cover" />
                : initials
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-500 hover:bg-brand-600 rounded-full flex items-center justify-center shadow-sm transition-colors"
            >
              <Camera size={13} className="text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{name}</p>
            <p className="text-xs text-gray-400 mt-0.5">NISN: {nisn}</p>
            <p className="text-xs text-gray-400">Kelas {grade} {studentClass}{department ? ` · ${department}` : ''}</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Ganti foto
            </button>
          </div>
        </div>
      </div>

      {/* Read-only info */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-5">Informasi Akun</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">NISN</label>
            <div className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-400 select-none">
              {nisn}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nama Lengkap</label>
            <div className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-400 select-none">
              {name}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Kelas</label>
            <div className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-400 select-none">
              {grade} {studentClass}{department ? ` — ${department}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Editable info */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-5">Informasi Profil</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Nama Tampilan
              <span className="text-gray-400 font-normal ml-1">(opsional)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={name}
              maxLength={60}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition"
            />
            <p className="text-xs text-gray-400 mt-1">Nama ini akan ditampilkan di sidebar menggantikan nama lengkap.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Ceritakan sedikit tentang dirimu..."
              rows={4}
              maxLength={200}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{bio.length} / 200 karakter</p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving
          ? <><Loader2 size={15} className="animate-spin" /> Menyimpan...</>
          : saved
          ? <><Check size={15} /> Tersimpan</>
          : 'Simpan Perubahan'
        }
      </button>
    </div>
  )
}
