'use client'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Artwork, Profile } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Heart } from 'lucide-react'

const CAT_COLORS: Record<string, string> = {
  Painting: 'cat-painting', Poster: 'cat-poster', Illustration: 'cat-illustration',
  Logo: 'cat-logo', Digital: 'cat-digital', Animation: 'cat-animation',
}

export default function StudentPortfolioPage() {
  const { username } = useParams<{ username: string }>()
  const [student, setStudent] = useState<Profile | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle()

      if (!profileData) {
        // Use demo data
        setStudent({
          id: '1', username, first_name: username.charAt(0).toUpperCase() + username.slice(1),
          last_name: '', email: '', role: 'student', grade: 'XI DKV 1', class: 'SMK DBB', created_at: '',
        })
        const demoArtworks: Artwork[] = Array.from({ length: 6 }, (_, i) => ({
          id: String(i + 1),
          title: ['Sakura Tree', 'Stop Bullying', 'Abstract Flow', 'Eco Poster', 'Digital Portrait', 'Bird Logo'][i],
          category: ['Painting', 'Poster', 'Illustration', 'Poster', 'Digital', 'Logo'][i],
          status: 'published',
          image_url: `https://picsum.photos/seed/${username}${i + 1}/400/400`,
          likes: [31, 90, 55, 39, 47, 28][i],
          creator_id: '1',
          profiles: undefined,
          created_at: '', updated_at: '',
        }))
        setArtworks(demoArtworks)
        setLoading(false)
        return
      }

      setStudent(profileData as Profile)

      const { data: artworkData } = await supabase
        .from('artworks')
        .select('*')
        .eq('creator_id', profileData.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (artworkData) setArtworks(artworkData as Artwork[])
      setLoading(false)
    }
    load()
  }, [username])

  const totalLikes = artworks.reduce((s, a) => s + (a.likes || 0), 0)

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <div className="border-b border-gray-100 bg-white/90 backdrop-blur-sm sticky top-16 z-30">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 h-12 flex items-center">
          <Link href="/portfolio" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            <ArrowLeft size={15} /> All Portfolios
          </Link>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="rounded-3xl p-8 flex flex-col sm:flex-row items-center gap-6"
            style={{ background: 'linear-gradient(135deg, #FDDCE5 0%, #FDD5D9 100%)' }}>
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-md shrink-0"
              style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
            >
              {(student?.first_name?.[0] || 'S').toUpperCase()}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="font-display text-3xl font-bold text-gray-900">
                {student ? `${student.first_name} ${student.last_name}`.trim() : username}
              </h1>
              {student?.grade && (
                <p className="text-brand-600 font-medium mt-1">Grade {student.grade} · {student.class}</p>
              )}
              {student?.bio && <p className="text-gray-600 text-sm mt-2">{student.bio}</p>}
            </div>
            <div className="flex gap-6 shrink-0">
              <div className="text-center">
                <p className="font-display text-2xl font-bold text-brand-500">{artworks.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Works</p>
              </div>
              <div className="text-center">
                <p className="font-display text-2xl font-bold text-rose-400 flex items-center gap-1 justify-center">
                  <Heart size={18} fill="currentColor" />{totalLikes}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Likes</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Artworks */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton rounded-2xl aspect-square" />)}
          </div>
        ) : artworks.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-lg font-medium">No published artworks yet</p>
            <p className="text-sm mt-1">Check back later!</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {artworks.map((art, i) => (
              <motion.div
                key={art.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
              >
                <Link href={`/gallery/${art.id}`} className="block group">
                  <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-brand-200 hover:shadow-md transition-all">
                    <div className="relative aspect-square overflow-hidden bg-gray-50">
                      <img
                        src={art.image_url || `https://picsum.photos/seed/${art.id}/400/400`}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2 left-2">
                        <span className={`pill text-[10px] ${CAT_COLORS[art.category] || 'cat-digital'}`}>
                          {art.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-sm text-gray-900 truncate">{art.title}</p>
                      <div className="flex items-center gap-1 mt-1 text-rose-300">
                        <Heart size={11} fill="currentColor" />
                        <span className="text-xs text-gray-400">{art.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
