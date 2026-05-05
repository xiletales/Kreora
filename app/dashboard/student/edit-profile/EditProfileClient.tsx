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
    if (!res.ok) { setError(json.error ?? 'Failed to save.'); return }

    setSaved(true)
    setFile(null)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">

      <div className="bg-white border border-brand-green-dark rounded-2xl p-6 lg:col-span-2">
        <h2 className="font-semibold text-gray-800 text-sm mb-5">Profile Photo</h2>
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-brand-pink text-brand-pink-dark text-xl font-bold">
              {preview
                ? <img src={preview} alt="" className="w-full h-full object-cover" />
                : initials
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-green-dark hover:bg-green-400 rounded-full flex items-center justify-center shadow-sm transition-colors"
            >
              <Camera size={13} className="text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{name}</p>
            <p className="text-xs text-gray-600 mt-0.5">NISN: {nisn}</p>
            <p className="text-xs text-gray-600">Grade {grade} {studentClass}{department ? ` · ${department}` : ''}</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-2 text-xs font-medium text-brand-pink-dark hover:underline"
            >
              Change photo
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-brand-green-dark rounded-2xl p-6">
        <h2 className="font-semibold text-gray-800 text-sm mb-5">Account Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">NISN</label>
            <div className="px-3 py-2.5 bg-brand-off-white border border-brand-green rounded-xl text-sm text-gray-700 select-none">
              {nisn}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
            <div className="px-3 py-2.5 bg-brand-off-white border border-brand-green rounded-xl text-sm text-gray-700 select-none">
              {name}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Class</label>
            <div className="px-3 py-2.5 bg-brand-off-white border border-brand-green rounded-xl text-sm text-gray-700 select-none">
              {grade} {studentClass}{department ? ` — ${department}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-brand-green-dark rounded-2xl p-6">
        <h2 className="font-semibold text-gray-800 text-sm mb-5">Profile Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-800 mb-1.5">
              Display Name
              <span className="text-gray-500 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={name}
              maxLength={60}
              className="w-full px-3 py-2.5 bg-white border border-brand-green-dark rounded-xl text-sm text-gray-800 focus:outline-none focus:border-brand-pink-dark focus:ring-2 focus:ring-brand-pink/40 transition"
            />
            <p className="text-xs text-gray-600 mt-1">This name will appear in the sidebar instead of your full name.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-800 mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell us a little about yourself..."
              rows={4}
              maxLength={200}
              className="w-full px-3 py-2.5 bg-white border border-brand-green-dark rounded-xl text-sm text-gray-800 focus:outline-none focus:border-brand-pink-dark focus:ring-2 focus:ring-brand-pink/40 transition resize-none"
            />
            <p className="text-xs text-gray-600 mt-1">{bio.length} / 200 characters</p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 lg:col-span-2">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="lg:col-span-2 flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold bg-brand-green-dark text-white rounded-xl hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving
          ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
          : saved
          ? <><Check size={15} /> Saved</>
          : 'Save Changes'
        }
      </button>
    </div>
  )
}
