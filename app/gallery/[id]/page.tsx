'use client'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Artwork } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Heart, ArrowLeft, Send, Share2, Bookmark, User } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const CAT_COLORS: Record<string, string> = {
  painting: 'cat-painting', poster: 'cat-poster', illustration: 'cat-illustration',
  logo: 'cat-logo', digital: 'cat-digital', animation: 'cat-animation',
}

const DEMO: Artwork = {
  id: '1', title: 'Stop Bullying Poster', category: 'Poster', status: 'published',
  image_url: 'https://picsum.photos/seed/detail1/800/900', likes: 28, creator_id: '',
  description: 'Poster ini dibuat dengan aplikasi canva untuk menyebarkan kesadaran anti bullying yang makin marak terjadi di lingkungan sekolah.',
  profiles: { id:'', username:'radika', first_name:'Radika', last_name:'Riski', email:'', role:'student', grade:'XI DKV 1', class:'SMK DBB', created_at:'' },
  created_at: '2024-10-13', updated_at: ''
}

interface Comment {
  id: string
  content: string
  guest_name?: string | null
  profiles: { first_name: string; last_name: string } | null
  created_at: string
}

export default function ArtworkDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const [artwork, setArtwork] = useState<Artwork>(DEMO)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [guestName, setGuestName] = useState('')
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(DEMO.likes)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const LIKE_KEY = `kreora_liked_${id}`

  useEffect(() => {
    async function load() {
      try {
        const { data: art } = await supabase
          .from('artworks').select('*, profiles(*)').eq('id', id).single()
        if (art) { setArtwork(art as Artwork); setLikeCount(art.likes || 0) }

        const { data: cmts } = await supabase
          .from('comments').select('*, profiles(*)')
          .eq('artwork_id', id).order('created_at', { ascending: false })
        if (cmts) setComments(cmts as Comment[])

        // Liked state: logged-in users check DB, guests check localStorage
        if (user) {
          const { data: likeData } = await supabase
            .from('artwork_likes').select('id')
            .eq('artwork_id', id).eq('user_id', user.id).maybeSingle()
          setLiked(!!likeData)
        } else {
          setLiked(!!localStorage.getItem(LIKE_KEY))
        }
      } catch { /* use demo */ }
      setLoading(false)
    }
    load()
  }, [id, user])

  async function handleLike() {
    const optimisticLiked = !liked
    setLiked(optimisticLiked)
    setLikeCount(c => optimisticLiked ? c + 1 : Math.max(0, c - 1))

    if (user) {
      // Logged-in: track in artwork_likes table
      if (optimisticLiked) {
        await supabase.from('artwork_likes').insert({ artwork_id: id, user_id: user.id })
        await supabase.from('artworks').update({ likes: likeCount + 1 }).eq('id', id)
      } else {
        await supabase.from('artwork_likes').delete()
          .eq('artwork_id', id).eq('user_id', user.id)
        await supabase.from('artworks').update({ likes: Math.max(0, likeCount - 1) }).eq('id', id)
      }
    } else {
      // Guest: track in localStorage, update likes count via RPC
      if (optimisticLiked) {
        localStorage.setItem(LIKE_KEY, '1')
        await supabase.rpc('increment_artwork_likes', { art_id: id, delta: 1 })
      } else {
        localStorage.removeItem(LIKE_KEY)
        await supabase.rpc('increment_artwork_likes', { art_id: id, delta: -1 })
      }
    }
  }

  async function handleComment() {
    if (!newComment.trim()) return
    if (!user && !guestName.trim()) {
      toast.error('Please enter your name to comment')
      return
    }
    setSubmitting(true)

    const insertData: Record<string, string | null> = {
      artwork_id: id,
      content: newComment.trim(),
      author_id: user ? user.id : null,
      guest_name: user ? null : guestName.trim(),
    }

    const { data, error } = await supabase
      .from('comments')
      .insert(insertData)
      .select('*, profiles(*)')
      .single()

    setSubmitting(false)
    if (error) { toast.error('Failed to post comment'); return }
    if (data) {
      setComments(prev => [data as Comment, ...prev])
      setNewComment('')
      toast.success('Comment posted!')
    }
  }

  const catCls = CAT_COLORS[artwork.category?.toLowerCase()] || 'cat-digital'
  const displayName = (c: Comment) =>
    c.profiles
      ? `${c.profiles.first_name} ${c.profiles.last_name}`.trim()
      : (c.guest_name || 'Guest')
  const avatarLetter = (c: Comment) =>
    c.profiles ? (c.profiles.first_name?.[0] || 'U').toUpperCase()
      : (c.guest_name?.[0] || 'G').toUpperCase()

  return (
    <div className="min-h-screen bg-white">

      {/* Top nav bar */}
      <div className="border-b border-gray-100 bg-white/90 backdrop-blur-sm sticky top-16 z-30">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 h-12 flex items-center justify-between">
          <Link href="/gallery" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            <ArrowLeft size={15} /> Gallery
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!') }}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Share2 size={16} />
            </button>
            <button className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
              <Bookmark size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 xl:gap-16">

          {/* ── LEFT: Image ── */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }}>
            <div className="rounded-2xl overflow-hidden bg-gray-50 shadow-md shadow-gray-200/60">
              <img
                src={artwork.image_url}
                alt={artwork.title}
                className="w-full object-cover"
                style={{ maxHeight: '80vh' }}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-5">
              <motion.button
                onClick={handleLike}
                whileTap={{ scale: 0.88 }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all border ${
                  liked
                    ? 'bg-rose-100 text-rose-500 border-rose-300 shadow-sm shadow-rose-100'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300 hover:text-rose-500'
                }`}
              >
                <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                <span>{likeCount}</span>
                <span className="font-normal">Appreciate</span>
              </motion.button>
            </div>
          </motion.div>

          {/* ── RIGHT: Info + Comments ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="flex flex-col"
          >
            {/* Category badge */}
            <span className={`pill text-xs mb-4 w-fit ${catCls}`}>{artwork.category}</span>

            {/* Title */}
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
              {artwork.title}
            </h1>

            {/* Creator info */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}>
                {(artwork.profiles?.first_name?.[0] || 'U').toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {artwork.profiles?.first_name} {artwork.profiles?.last_name}
                </p>
                {artwork.profiles?.grade && (
                  <p className="text-xs text-gray-400">
                    {artwork.profiles.grade} · {artwork.profiles.class}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            {artwork.description && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">About this work</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{artwork.description}</p>
              </div>
            )}

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Status</p>
                <span className={`text-xs font-semibold ${artwork.status === 'published' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {artwork.status?.replace('_', ' ')}
                </span>
              </div>
              {artwork.created_at && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Published</p>
                  <span className="text-xs text-gray-700 font-medium">
                    {new Date(artwork.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            {/* Teacher action */}
            {profile?.role === 'teacher' && (
              <button className="btn-primary w-full mb-6">Grade this Artwork</button>
            )}

            {/* Comments */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">
                Comments{comments.length > 0 && (
                  <span className="ml-1.5 text-gray-400 font-normal">({comments.length})</span>
                )}
              </h3>

              {/* Comment input */}
              <div className="mb-5 space-y-2">
                {/* Guest name field — only shown when not logged in */}
                {!user && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User size={12} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      className="kreora-input flex-1 text-sm rounded-full py-2 px-4"
                      maxLength={40}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold shrink-0 mt-0.5">
                    {user
                      ? (profile?.first_name?.[0] || 'U').toUpperCase()
                      : (guestName?.[0] || '?').toUpperCase()
                    }
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      placeholder="Add your comment..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                      className="kreora-input flex-1 text-sm rounded-full py-2 px-4"
                    />
                    <motion.button
                      onClick={handleComment}
                      whileTap={{ scale: 0.9 }}
                      disabled={submitting || !newComment.trim() || (!user && !guestName.trim())}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <Send size={14} />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Comment list */}
              <div className="space-y-3">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full skeleton shrink-0" />
                      <div className="flex-1 skeleton rounded-2xl h-14" />
                    </div>
                  ))
                ) : comments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No comments yet. Be the first!</p>
                ) : (
                  comments.map(c => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2.5"
                    >
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 mt-0.5">
                        {avatarLetter(c)}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-2xl px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-800">{displayName(c)}</span>
                          {!c.profiles && (
                            <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">Guest</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{c.content}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
