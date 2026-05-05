'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { X, Upload, CloudUpload } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props { open: boolean; onClose: () => void; onUploaded?: () => void }

const CATEGORIES = ['Painting', 'Poster', 'Illustration', 'Logo', 'Digital', 'Animation']
const STATUSES = ['In Progress', 'Published', 'Pending']

export default function UploadArtworkModal({ open, onClose, onUploaded }: Props) {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('In Progress')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [drag, setDrag] = useState(false)

  function handleFile(f: File) {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) handleFile(f)
  }

  async function handleUpload() {
    if (!user || !file || !title || !category) { toast.error('Fill in all fields and select an image'); return }
    setLoading(true)
    try {
      // Upload image to Supabase storage
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: storageError } = await supabase.storage.from('artworks').upload(path, file)
      if (storageError) throw storageError

      const { data: urlData } = supabase.storage.from('artworks').getPublicUrl(path)

      // Insert artwork record
      const { error: dbError } = await supabase.from('artworks').insert({
        title, category: category.toLowerCase(), status: status.toLowerCase().replace(' ', '_'),
        description, image_url: urlData.publicUrl, creator_id: user.id, likes: 0
      })
      if (dbError) throw dbError

      toast.success('Artwork uploaded!')
      onUploaded?.()
      onClose()
      setFile(null); setPreview(''); setTitle(''); setCategory(''); setDescription('')
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Upload failed')
    }
    setLoading(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2e25]/40 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => e.target === e.currentTarget && onClose()}>
          <motion.div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.92, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}>

            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold text-gray-800">Upload Artwork</h2>
                <button onClick={onClose} className="p-2 hover:bg-rose-50 rounded-xl transition-colors"><X size={18} /></button>
              </div>

              {/* Drop zone */}
              <div
                className={`upload-zone p-6 text-center mb-5 ${drag ? 'border-rose-500 bg-rose-100' : ''}`}
                onDragOver={e => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                {preview ? (
                  <img src={preview} alt="" className="max-h-48 mx-auto rounded-xl object-contain" />
                ) : (
                  <>
                    <CloudUpload size={36} className="mx-auto text-rose-300 mb-3" />
                    <p className="text-sm text-gray-500">Click to upload or drag & drop</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF, SVG, GIF, MP4, BMP</p>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Title</label>
                  <input className="kreora-input" placeholder="Artwork title" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                  <select className="kreora-input" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
                  <select className="kreora-input" value={status} onChange={e => setStatus(e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                  <textarea className="kreora-input resize-none" rows={3} placeholder="Describe your artwork..."
                    value={description} onChange={e => setDescription(e.target.value)} />
                </div>
              </div>

              <motion.button whileTap={{ scale: 0.97 }} onClick={handleUpload} disabled={loading}
                className="btn-primary w-full mt-5 flex items-center justify-center gap-2 disabled:opacity-60">
                <Upload size={16} /> {loading ? 'Uploading...' : 'Upload Artwork'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
