'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase, Artwork } from '@/lib/supabase'
import { ArrowRight, Sparkles, TrendingUp, Image, GraduationCap, Trophy, Star } from 'lucide-react'

interface CategoryGroup {
  name: string; artworks: Artwork[]; filter: string[]
}

const CATEGORIES: CategoryGroup[] = [
  { name: 'Traditional & Digital Art', filter: ['painting', 'illustration', 'digital'], artworks: [] },
  { name: 'Poster Design', filter: ['poster'], artworks: [] },
  { name: 'Logo & Branding', filter: ['logo'], artworks: [] },
]

const ASPECT_RATIOS = [
  'aspect-[3/4]', 'aspect-square', 'aspect-[4/5]', 'aspect-[2/3]',
  'aspect-[4/3]', 'aspect-square', 'aspect-[3/4]', 'aspect-[5/4]',
]

const DEMO: Artwork[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  title: ['Sakura Tree', 'Stop Bullying', 'Abstract Flow', 'Bird Logo', 'Walking Anim', 'Digital Portrait', 'Fun Illus', 'Eco Poster', 'Cubism', 'Starry Night', 'Independence', 'Dolphin'][i],
  category: ['Painting', 'Poster', 'Illustration', 'Logo', 'Animation', 'Digital', 'Illustration', 'Poster', 'Painting', 'Illustration', 'Poster', 'Illustration'][i],
  status: 'published',
  image_url: `https://picsum.photos/seed/home${i+1}/600/${300 + (i % 4) * 80}`,
  likes: [31, 90, 55, 28, 64, 47, 82, 39, 56, 74, 23, 88][i],
  creator_id: '',
  profiles: { id:'', username:'', first_name: ['Karina','Radika','James','Beby','Martin','Lisa','Irene','Novia','Kol','Riko','Una','Martin'][i], last_name:'', email:'', role:'student', created_at:'' },
  created_at: '', updated_at: ''
}))

const CAT_COLORS: Record<string, string> = {
  Painting: 'cat-painting', Poster: 'cat-poster', Illustration: 'cat-illustration',
  Logo: 'cat-logo', Digital: 'cat-digital', Animation: 'cat-animation',
}

const STATS = [
  { Icon: Image,          value: '150+', label: 'Artworks', color: 'text-rose-600',    bg: 'bg-rose-50' },
  { Icon: GraduationCap,  value: '50+',  label: 'Students',  color: 'text-violet-600', bg: 'bg-violet-50' },
  { Icon: Trophy,         value: '12',   label: 'Awards',    color: 'text-amber-600',  bg: 'bg-amber-50' },
  { Icon: Star,           value: '4.9',  label: 'Rating',    color: 'text-emerald-600',bg: 'bg-emerald-50' },
]

const FLOAT_IMAGES = [
  { seed: 'hero1', w: 160, h: 210, top: '8%',  right: '4%',  rot: 4,  delay: 1.8 },
  { seed: 'hero2', w: 120, h: 150, top: '2%',  right: '22%', rot: -3, delay: 2.0 },
  { seed: 'hero3', w: 100, h: 130, top: '52%', right: '10%', rot: 6,  delay: 2.2 },
  { seed: 'hero4', w: 130, h: 110, top: '60%', right: '28%', rot: -5, delay: 2.1 },
]

const stagger = {
  show: { transition: { staggerChildren: 0.1 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

export default function HomePage() {
  const [artworks, setArtworks] = useState<Artwork[]>(DEMO)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('artworks').select('*, profiles(*)').eq('status', 'published')
      .order('likes', { ascending: false }).limit(12)
      .then(({ data }) => {
        if (data && data.length > 0) setArtworks(data as Artwork[])
        setLoading(false)
      }, () => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-white">

      {/* ═══════════════ HERO (dark) ═══════════════ */}
      <section className="hero-dark relative min-h-[88vh] flex flex-col justify-center overflow-hidden px-4 sm:px-8 py-24">

        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
        />

        {/* Rose glow orbs */}
        <motion.div
          className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
          style={{ background: 'radial-gradient(circle, #337357 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.1, 1], x: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-15 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #E27396 0%, transparent 70%)' }}
          animate={{ scale: [1.1, 1, 1.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Floating artwork cards */}
        {FLOAT_IMAGES.map((img, i) => (
          <motion.div
            key={i}
            className="hidden lg:block absolute rounded-xl overflow-hidden shadow-2xl shadow-black/40"
            style={{ top: img.top, right: img.right, width: img.w, height: img.h }}
            initial={{ opacity: 0, y: 20, rotate: img.rot }}
            animate={{ opacity: 0.85, y: 0, rotate: img.rot }}
            transition={{ duration: 0.8, delay: img.delay, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.img
              src={`https://picsum.photos/seed/${img.seed}/${img.w * 2}/${img.h * 2}`}
              alt=""
              className="w-full h-full object-cover"
              animate={{ y: [-6, 6, -6] }}
              transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%)' }} />
          </motion.div>
        ))}

        {/* Hero content */}
        <div className="max-w-screen-xl mx-auto relative z-10 lg:max-w-2xl xl:max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.5 }}
            className="mb-6"
          >
            <span className="hero-badge">
              <Sparkles size={11} /> Student Creative Showcase
            </span>
          </motion.div>

          <motion.h1
            className="font-display font-bold text-white leading-[1.08] mb-6"
            style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)' }}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.65, ease: [0.22, 1, 0.36, 1] }}
          >
            Where Student<br />
            <span className="text-gradient-warm italic">Creativity</span>
            <br />Comes Alive
          </motion.h1>

          <motion.p
            className="text-gray-400 text-lg max-w-lg mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.8, ease: [0.22, 1, 0.36, 1] }}
          >
            Discover outstanding artworks from talented SMK students.
            Portfolios, galleries, and creative journeys — all in one place.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.95, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link href="/gallery" className="btn-primary inline-flex items-center gap-2 text-base px-6 py-3">
              Explore Gallery <ArrowRight size={16} />
            </Link>
            <Link href="/signup" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-300 border border-white/20 hover:border-white/40 hover:text-white px-6 py-3 rounded-lg transition-all">
              Join as Student
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.3 }}
        >
          <span className="text-gray-600 text-xs font-medium tracking-widest uppercase">Scroll</span>
          <motion.div
            className="w-px h-12 bg-gradient-to-b from-gray-600 to-transparent"
            animate={{ scaleY: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </section>

      {/* ═══════════════ STATS ═══════════════ */}
      <section className="bg-white py-12 px-4 sm:px-8 border-b border-gray-100">
        <div className="max-w-screen-xl mx-auto">
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
          >
            {STATS.map(s => (
              <motion.div key={s.label} variants={fadeUp} className="stat-card text-center">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                  <s.Icon size={18} className={s.color} />
                </div>
                <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ TRENDING (masonry preview) ═══════════════ */}
      <section className="py-20 px-4 sm:px-8">
        <div className="max-w-screen-xl mx-auto">
          <motion.div
            className="flex items-end justify-between mb-10"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <p className="section-label flex items-center gap-1.5 mb-2"><TrendingUp size={12} /> Trending</p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">
                Explore Creative Work
              </h2>
            </div>
            <Link href="/gallery" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-rose-600 transition-colors group">
              View all
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Masonry grid */}
          {loading ? (
            <div className="masonry">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`bh-card ${ASPECT_RATIOS[i % ASPECT_RATIOS.length]} skeleton rounded-xl`} />
              ))}
            </div>
          ) : (
            <div className="masonry">
              {artworks.map((art, i) => (
                <motion.div
                  key={art.id}
                  className="bh-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.45, delay: (i % 4) * 0.07 }}
                >
                  <Link href={`/gallery/${art.id}`} className="block bh-card-inner">
                    <div className="bh-card-img">
                      <img
                        src={art.image_url || `https://picsum.photos/seed/art${i}/600/400`}
                        alt={art.title}
                        style={{ aspectRatio: [3/4, 1, 4/5, 2/3, 4/3, 1, 3/4, 5/4][i % 8] }}
                      />
                      <div className="bh-card-overlay">
                        <span className={`pill text-[10px] ${CAT_COLORS[art.category] || 'cat-digital'}`}>
                          {art.category}
                        </span>
                        <span className="text-white text-xs font-medium flex items-center gap-1">
                          ♥ {art.likes || 0}
                        </span>
                      </div>
                    </div>
                    <div className="bh-card-meta">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{art.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {art.profiles?.first_name || 'Unknown'} {art.profiles?.last_name || ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 shrink-0 text-xs">
                        ♥ <span>{art.likes || 0}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          <div className="text-center mt-10 sm:hidden">
            <Link href="/gallery" className="btn-outline inline-flex items-center gap-2">
              View all artworks <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ CATEGORY SECTIONS ═══════════════ */}
      {CATEGORIES.map((group, gi) => (
        <section key={group.name} className={`py-14 px-4 sm:px-8 ${gi % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'}`}>
          <div className="max-w-screen-xl mx-auto">
            <motion.div
              className="flex items-end justify-between mb-8"
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5 }}
            >
              <div>
                <p className="section-label mb-2">Category</p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">{group.name}</h2>
              </div>
              <Link href="/gallery" className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-rose-600 transition-colors group">
                See all <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-40px' }}
            >
              {DEMO.slice(gi * 3, gi * 3 + 4).map((art, i) => (
                <motion.div key={art.id} variants={fadeUp}>
                  <Link href={`/gallery/${art.id}`} className="block bh-card-inner group rounded-xl overflow-hidden border border-gray-100">
                    <div className="bh-card-img">
                      <img
                        src={`https://picsum.photos/seed/cat${gi}${i}/400/350`}
                        alt={art.title}
                        className="w-full aspect-[4/3] object-cover"
                        style={{ display: 'block' }}
                      />
                      <div className="bh-card-overlay">
                        <span className={`pill text-[10px] ${CAT_COLORS[art.category] || 'cat-digital'}`}>{art.category}</span>
                        <span className="text-white text-xs">♥ {art.likes}</span>
                      </div>
                    </div>
                    <div className="bh-card-meta">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{art.title}</p>
                        <p className="text-xs text-gray-500">{art.profiles?.first_name}</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      ))}

      {/* ═══════════════ CTA SECTION ═══════════════ */}
      <section className="py-24 px-4 sm:px-8">
        <div className="max-w-screen-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-3xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0C0C0F 0%, #1a0510 50%, #0C0C0F 100%)' }}
          >
            {/* Rose glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-25 blur-[80px]"
              style={{ background: 'radial-gradient(circle, #337357 0%, transparent 70%)' }}
            />
            <div className="relative z-10 py-20 px-8 sm:px-16 text-center">
              <div className="flex justify-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(225,29,72,0.2)' }}>
                  <Sparkles size={22} className="text-rose-400" />
                </div>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Showcase Your Art?
              </h2>
              <p className="text-gray-400 mb-10 max-w-md mx-auto leading-relaxed">
                Join Kreora and share your creative journey with students, teachers, and the world.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/signup" className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2">
                  Get Started Free <ArrowRight size={16} />
                </Link>
                <Link href="/gallery" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-300 border border-white/20 hover:border-white/40 hover:text-white px-8 py-3 rounded-lg transition-all">
                  Browse Gallery
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
