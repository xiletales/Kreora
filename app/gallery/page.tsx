'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useMemo } from 'react'
import { supabase, Artwork } from '@/lib/supabase'
import { Search, SlidersHorizontal, X, Heart, TrendingUp, Clock, AlignLeft } from 'lucide-react'
import Link from 'next/link'

const CATS = [
  { id: 'All',          label: 'All' },
  { id: 'Painting',     label: 'Painting' },
  { id: 'Poster',       label: 'Poster' },
  { id: 'Illustration', label: 'Illustration' },
  { id: 'Logo',         label: 'Logo' },
  { id: 'Digital',      label: 'Digital' },
  { id: 'Animation',    label: 'Animation' },
]

const SORT_OPTIONS = [
  { id: 'likes',   label: 'Most Liked',  Icon: TrendingUp },
  { id: 'newest',  label: 'Newest',      Icon: Clock },
  { id: 'az',      label: 'A – Z',       Icon: AlignLeft },
] as const
type SortId = typeof SORT_OPTIONS[number]['id']

const CAT_COLORS: Record<string, string> = {
  Painting: 'cat-painting', Poster: 'cat-poster', Illustration: 'cat-illustration',
  Logo: 'cat-logo', Digital: 'cat-digital', Animation: 'cat-animation',
}

const DEMO: Artwork[] = Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  title: [
    'Sakura Tree','Stop Bullying','Abstract Flow','Bird Logo','Walking Anim','Digital Portrait',
    'Fun Illus','Eco Poster','Cubism Study','Starry Night','Independence','Dolphin Mosaic',
    'Tree Painting','Leviosa','Flowers','Cats','Abstract II','Poster Merdeka','Tiger Cub','Galaxy'
  ][i],
  category: ['Painting','Poster','Illustration','Logo','Animation','Digital','Illustration','Poster','Painting',
             'Illustration','Poster','Illustration','Painting','Illustration','Digital','Painting','Illustration',
             'Poster','Digital','Illustration'][i],
  status: 'published',
  image_url: `https://picsum.photos/seed/gal${i+1}/600/${280 + (i % 5) * 70}`,
  likes: [31,90,55,28,64,47,82,39,56,74,23,88,41,67,35,92,18,53,76,44][i],
  creator_id: '',
  profiles: { id:'', username:'', first_name:['Karina','Radika','James','Beby','Martin','Lisa','Irene','Novia','Kai','Riko','Una','Martin','Karina','Karina','Irene','Kai','Karina','Karina','Martin','Lisa'][i], last_name:'', email:'', role:'student', created_at:'' },
  created_at: ['2026-04-01','2026-03-28','2026-03-20','2026-02-14','2026-02-10','2026-01-30',
               '2025-12-15','2025-12-01','2025-11-20','2025-11-05','2025-10-22','2025-10-01',
               '2025-09-15','2025-09-01','2025-08-20','2025-08-01','2025-07-15','2025-07-01',
               '2025-06-15','2025-06-01'][i],
  updated_at: ''
}))

export default function GalleryPage() {
  const [artworks, setArtworks] = useState<Artwork[]>(DEMO)
  const [activeCat, setActiveCat] = useState('All')
  const [sortBy, setSortBy] = useState<SortId>('newest')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    supabase.from('artworks').select('*, profiles(*)').eq('status', 'published')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) setArtworks(data as Artwork[])
        setLoading(false)
      }, () => setLoading(false))
  }, [])

  // Filter + sort derived from artworks state
  const filtered = useMemo(() => {
    let res = artworks

    if (activeCat !== 'All')
      res = res.filter(a => a.category?.toLowerCase() === activeCat.toLowerCase())

    if (search.trim())
      res = res.filter(a =>
        a.title?.toLowerCase().includes(search.toLowerCase()) ||
        a.profiles?.first_name?.toLowerCase().includes(search.toLowerCase())
      )

    const copy = [...res]
    if (sortBy === 'likes')  copy.sort((a, b) => (b.likes || 0) - (a.likes || 0))
    if (sortBy === 'newest') copy.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    if (sortBy === 'az')     copy.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    return copy
  }, [artworks, activeCat, search, sortBy])

  return (
    <div className="min-h-screen bg-white">

      {/* ── Top bar ── */}
      <div className="sticky top-16 z-40 bg-white border-b border-gray-100 shadow-sm shadow-gray-100/60">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-3 flex flex-col gap-3">

          {/* Search + filter toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search artworks, creators..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-full outline-none focus:bg-white focus:border-brand-300 focus:shadow-[0_0_0_3px_rgba(51,115,87,0.12)] transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full text-sm font-medium border transition-all ${showFilters ? 'bg-brand-50 border-brand-300 text-brand-600' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              <SlidersHorizontal size={14} /> Filters
            </button>
            <p className="hidden sm:block text-sm text-gray-400 ml-1 shrink-0">
              {filtered.length} results
            </p>
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {CATS.map(cat => (
              <motion.button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                whileTap={{ scale: 0.95 }}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${
                  activeCat === cat.id
                    ? 'bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-500'
                }`}
              >
                {cat.label}
              </motion.button>
            ))}
          </div>

          {/* Sort options — shown when filter panel is open */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-1 pb-0.5">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Sort by</p>
                  <div className="flex items-center gap-2">
                    {SORT_OPTIONS.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        onClick={() => setSortBy(id)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${
                          sortBy === id
                            ? 'bg-brand-500 text-white border-brand-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-500'
                        }`}
                      >
                        <Icon size={13} /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Gallery heading ── */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 pt-12 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="section-label mb-2">
            {activeCat === 'All' ? 'All Artworks' : activeCat}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">
            {activeCat === 'All' ? 'Explore Gallery' : activeCat}
          </h1>
          {search && (
            <p className="text-gray-500 text-sm mt-1">
              Showing results for &ldquo;<span className="text-rose-500 font-medium">{search}</span>&rdquo;
            </p>
          )}
        </motion.div>
      </div>

      {/* ── Masonry grid ── */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 pb-20">
        <AnimatePresence mode="wait">
          {loading ? (
            <div key="loading" className="masonry">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bh-card skeleton rounded-xl" style={{ height: 200 + (i % 4) * 60 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-32"
            >
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-gray-300" />
              </div>
              <p className="font-display text-xl font-bold text-gray-700 mb-1">Nothing found</p>
              <p className="text-gray-400 text-sm">Try a different search or category</p>
              <button
                onClick={() => { setSearch(''); setActiveCat('All') }}
                className="btn-outline mt-6"
              >
                Clear filters
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={`${activeCat}-${search}-${sortBy}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="masonry"
            >
              {filtered.map((art, i) => (
                <motion.div
                  key={art.id}
                  className="bh-card"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: (i % 5) * 0.06 }}
                >
                  <Link href={`/gallery/${art.id}`} className="block bh-card-inner">
                    <div className="bh-card-img">
                      <img
                        src={art.image_url || ''}
                        alt={art.title}
                        style={{
                          width: '100%',
                          display: 'block',
                          aspectRatio: [3/4, 1, 4/5, 2/3, 5/4, 4/3, 3/4, 1][i % 8],
                          objectFit: 'cover',
                        }}
                      />
                      <div className="bh-card-overlay">
                        <span className={`pill text-[10px] ${CAT_COLORS[art.category] || 'cat-digital'}`}>
                          {art.category}
                        </span>
                        <span className="flex items-center gap-1 text-white text-xs bg-white/20 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
                          <Heart size={11} fill="currentColor" /> {art.likes || 0}
                        </span>
                      </div>
                    </div>
                    <div className="bh-card-meta">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {(art.profiles?.first_name?.[0] || 'U').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{art.title}</p>
                          <p className="text-[11px] text-gray-400 truncate">{art.profiles?.first_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-rose-300 shrink-0 text-xs">
                        <Heart size={11} fill="currentColor" />
                        <span className="text-gray-500">{art.likes || 0}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
