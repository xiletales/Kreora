'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, GraduationCap, Palette, Trophy, Users } from 'lucide-react'

const VALUES = [
  {
    icon: Palette,
    title: 'Creative Expression',
    desc: 'We believe every student has a unique creative voice. Kreora provides the space to express it without boundaries.',
  },
  {
    icon: GraduationCap,
    title: 'Skill Development',
    desc: 'From painting to digital design, students grow their craft through assignments, feedback, and peer inspiration.',
  },
  {
    icon: Users,
    title: 'Community',
    desc: 'A supportive community of students and teachers working together to celebrate creativity and growth.',
  },
  {
    icon: Trophy,
    title: 'Recognition',
    desc: 'Outstanding work gets the recognition it deserves — through curated showcases, badges, and school exhibitions.',
  },
]

const TEAM = [
  { name: 'SMK DBB', role: 'Institution', desc: 'Sekolah Menengah Kejuruan with a strong focus on creative and vocational arts.' },
  { name: 'DKV Department', role: 'Desain Komunikasi Visual', desc: 'The visual communication design department behind the creative works you see here.' },
]

const stagger = { show: { transition: { staggerChildren: 0.1 } } }
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative py-24 px-4 sm:px-8 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0C0C0F 0%, #0d2419 100%)' }}>
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-20 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #337357 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[300px] h-[300px] rounded-full opacity-15 blur-[80px]"
          style={{ background: 'radial-gradient(circle, #E27396 0%, transparent 70%)' }} />

        <div className="max-w-screen-xl mx-auto relative z-10 text-center">
          <motion.p
            className="section-label mb-4 justify-center flex items-center gap-2"
            style={{ color: '#6D9F71' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            About Us
          </motion.p>
          <motion.h1
            className="font-display font-bold text-white mb-6"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            About{' '}
            <span style={{
              background: 'linear-gradient(135deg, #6D9F71 0%, #EA9AB2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Kreora
            </span>
          </motion.h1>
          <motion.p
            className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            Kreora is a digital portfolio and gallery platform built for SMK students to
            showcase their creative artworks, track their progress, and inspire each other.
          </motion.p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-4 sm:px-8">
        <div className="max-w-screen-xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6 }}
            >
              <p className="section-label mb-3">Our Mission</p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Empowering Student<br />Creativity
              </h2>
              <p className="text-gray-500 leading-relaxed mb-4">
                Kreora was created to bridge the gap between classroom art education and real-world
                portfolio building. We wanted every student — from first-year DKV students to
                graduating seniors — to have a professional space to document their creative journey.
              </p>
              <p className="text-gray-500 leading-relaxed">
                Teachers can assign projects, give feedback, and curate works for school exhibitions,
                while students build portfolios that reflect their growth over time.
              </p>
            </motion.div>

            <motion.div
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6 }}
            >
              {[
                { label: '150+', sub: 'Artworks published' },
                { label: '50+', sub: 'Active students' },
                { label: '12', sub: 'Awards given' },
                { label: '2026', sub: 'Year founded' },
              ].map(s => (
                <div key={s.label} className="stat-card text-center">
                  <p className="font-display text-3xl font-bold text-brand-500">{s.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 sm:px-8 bg-gray-50/60">
        <div className="max-w-screen-xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="section-label mb-3">What We Stand For</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">Our Values</h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
          >
            {VALUES.map(v => (
              <motion.div key={v.title} variants={fadeUp} className="stat-card">
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                  <v.icon size={22} className="text-brand-500" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Institution */}
      <section className="py-20 px-4 sm:px-8">
        <div className="max-w-screen-xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="section-label mb-3">Behind Kreora</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">The Institution</h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {TEAM.map(t => (
              <motion.div key={t.name} variants={fadeUp} className="stat-card">
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}>
                  {t.name[0]}
                </div>
                <h3 className="font-bold text-gray-900">{t.name}</h3>
                <p className="text-xs text-brand-500 font-semibold mb-2">{t.role}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{t.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-8 bg-gray-50/60">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
              Ready to Explore?
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Browse student portfolios, discover amazing artworks, or join Kreora as a teacher.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/gallery" className="btn-primary inline-flex items-center gap-2">
                Explore Gallery <ArrowRight size={16} />
              </Link>
              <Link href="/portfolio" className="btn-outline inline-flex items-center gap-2">
                View Portfolios
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
