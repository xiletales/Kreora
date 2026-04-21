'use client'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { supabase, Artwork } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import ArtworkCard from '@/components/ArtworkCard'
import UploadArtworkModal from '@/components/UploadArtworkModal'
import { Plus, Heart } from 'lucide-react'

const DEMO: Artwork[] = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1), title: ['Sakura Tree', 'Poster 101', 'Fun Illustration', 'Eco Poster', 'Abstract', 'Logo Design'][i],
  category: ['Painting', 'Poster', 'Illustration', 'Poster', 'Painting', 'Logo'][i],
  status: i % 3 === 0 ? 'in_progress' : 'published',
  image_url: `https://picsum.photos/seed/port${i + 1}/400/400`,
  likes: Math.floor(Math.random() * 100), creator_id: '',
  profiles: { id: '', username: 'karina', first_name: 'Karina', last_name: '', email: '', role: 'student', created_at: '' },
  created_at: '', updated_at: ''
}))

export default function PortfolioPage() {
  const { user, profile } = useAuth()
  const [artworks, setArtworks] = useState<Artwork[]>(DEMO)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadArtworks() {
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from('artworks').select('*, profiles(*)').eq('creator_id', user.id).order('created_at', { ascending: false })
    if (data && data.length > 0) setArtworks(data as Artwork[])
    setLoading(false)
  }

  useEffect(() => { loadArtworks() }, [user])

  const totalLikes = artworks.reduce((sum, a) => sum + (a.likes || 0), 0)
  const published = artworks.filter(a => a.status === 'published').length

  return (
    <div className="min-h-screen py-10 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="bg-gradient-to-br from-rose-100 to-pink-100 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-rose-300 ring-4 ring-white ring-offset-2 flex items-center justify-center text-4xl font-bold text-white shrink-0">
              {profile?.first_name?.[0]?.toUpperCase() || 'K'}
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="font-display text-3xl font-bold text-gray-800">
                {profile ? `${profile.first_name} ${profile.last_name}` : 'Portfolio'}
              </h1>
              {profile?.grade && <p className="text-rose-600 mt-1">{profile.grade} • {profile.class}</p>}
              {profile?.subject_specialization && <p className="text-gray-500 text-sm mt-1">{profile.subject_specialization}</p>}
            </div>
            <div className="flex gap-6 shrink-0">
              <div className="text-center">
                <p className="font-display text-2xl font-bold text-rose-600">{artworks.length}</p>
                <p className="text-xs text-gray-500">Works</p>
              </div>
              <div className="text-center">
                <p className="font-display text-2xl font-bold text-rose-600">{published}</p>
                <p className="text-xs text-gray-500">Published</p>
              </div>
              <div className="text-center">
                <p className="font-display text-2xl font-bold text-rose-600 flex items-center gap-1"><Heart size={18} fill="currentColor" />{totalLikes}</p>
                <p className="text-xs text-gray-500">Likes</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Upload button */}
        {user && (
          <div className="flex justify-end mb-6">
            <button onClick={() => setUploadOpen(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Upload Artwork
            </button>
          </div>
        )}

        {/* Artworks grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-rose-100 rounded-2xl aspect-square animate-pulse" />)}
          </div>
        ) : artworks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {artworks.map((art, i) => <ArtworkCard key={art.id} artwork={art} index={i} />)}
          </div>
        ) : (
          <div className="text-center py-24 text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Plus size={28} className="text-gray-300" />
            </div>
            <p className="text-lg font-medium">No artworks yet</p>
            <p className="text-sm mt-1">Upload your first artwork to get started</p>
            <button onClick={() => setUploadOpen(true)} className="btn-primary mt-6 inline-flex items-center gap-2">
              <Plus size={16} /> Upload Artwork
            </button>
          </div>
        )}
      </div>

      <UploadArtworkModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={loadArtworks} />
    </div>
  )
}
