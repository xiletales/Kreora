'use client'
import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { ArrowLeft, Camera, Save } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function EditProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    username: profile?.username || '',
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    grade: profile?.grade || '',
    class: profile?.class || '',
    subject_specialization: profile?.subject_specialization || '',
    bio: profile?.bio || '',
  })
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  function update(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarFile(f)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  async function handleSave() {
    if (!user) return
    setLoading(true)
    try {
      let avatar_url = profile?.avatar_url
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatar_url = data.publicUrl
      }
      const { error } = await supabase.from('profiles').update({ ...form, avatar_url }).eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      toast.success('Profile updated!')
      router.push('/dashboard')
    } catch (err: unknown) {
      toast.error((err as Error).message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-md mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-lg border border-rose-100 p-6">
          <h1 className="font-display text-xl font-bold text-gray-800 mb-6">Edit Profile</h1>

          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-rose-100 ring-4 ring-rose-200 ring-offset-2 overflow-hidden flex items-center justify-center text-3xl font-bold text-rose-400">
                {avatarPreview ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" /> : (form.first_name[0] || '?')}
              </div>
              <button onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-rose-600 rounded-full flex items-center justify-center text-white shadow-md hover:bg-rose-700 transition-colors">
                <Camera size={14} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Username</label>
              <input className="kreora-input" value={form.username} onChange={e => update('username', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">First Name</label>
                <input className="kreora-input" value={form.first_name} onChange={e => update('first_name', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label>
                <input className="kreora-input" value={form.last_name} onChange={e => update('last_name', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Grade</label>
              <input className="kreora-input" placeholder="e.g. XI DKV 1" value={form.grade} onChange={e => update('grade', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Class / School</label>
              <input className="kreora-input" placeholder="e.g. SMK DBB" value={form.class} onChange={e => update('class', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Subject Specialization</label>
              <input className="kreora-input" placeholder="e.g. Illustrations and Poster designs" value={form.subject_specialization} onChange={e => update('subject_specialization', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Bio</label>
              <textarea className="kreora-input resize-none" rows={3} placeholder="Tell us about yourself..."
                value={form.bio} onChange={e => update('bio', e.target.value)} />
            </div>
          </div>

          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={loading}
            className="btn-primary w-full mt-6 flex items-center justify-center gap-2 disabled:opacity-60">
            <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}
