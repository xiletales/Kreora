'use client'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import Link from 'next/link'
import { Search, X, Users } from 'lucide-react'

const DEMO_STUDENTS: Profile[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  username: ['karina', 'radika', 'james', 'beby', 'martin', 'lisa', 'irene', 'novia', 'kai', 'riko', 'una', 'naura'][i],
  first_name: ['Karina', 'Radika', 'James', 'Beby', 'Martin', 'Lisa', 'Irene', 'Novia', 'Kai', 'Riko', 'Una', 'Naura'][i],
  last_name: ['Putri', 'Rizki', 'Chen', 'Angelia', 'Sitepu', 'Tanaka', 'Park', 'Santoso', 'Lim', 'Hasan', 'Dewi', 'Yumna'][i],
  email: '',
  role: 'student',
  grade: ['XI', 'XI', 'XI', 'XI', 'XII', 'XII', 'XII', 'X', 'X', 'X', 'XI', 'XII'][i],
  class: ['DKV 1', 'DKV 1', 'DKV 2', 'DKV 2', 'DKV 1', 'DKV 1', 'DKV 2', 'DKV 1', 'DKV 2', 'MM 1', 'MM 1', 'DKV 2'][i],
  created_at: '',
}))

const GRADE_FILTERS = ['All', 'X', 'XI', 'XII']

export default function PortfolioPage() {
  const [students, setStudents] = useState<Profile[]>(DEMO_STUDENTS)
  const [filtered, setFiltered] = useState<Profile[]>(DEMO_STUDENTS)
  const [search, setSearch] = useState('')
  const [activeGrade, setActiveGrade] = useState('All')

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'student').order('first_name')
      .then(({ data }) => {
        if (data && data.length > 0) { setStudents(data as Profile[]); setFiltered(data as Profile[]) }
      }, () => {})
  }, [])

  useEffect(() => {
    let res = students
    if (activeGrade !== 'All') res = res.filter(s => s.grade?.startsWith(activeGrade))
    if (search) res = res.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      s.username?.toLowerCase().includes(search.toLowerCase())
    )
    setFiltered(res)
  }, [search, activeGrade, students])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 pt-12 pb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="section-label flex items-center gap-1.5 mb-2"><Users size={12} /> Students</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">Student Portfolios</h1>
          <p className="text-gray-500 text-sm mt-2">Explore the creative work of our students</p>
        </motion.div>
      </div>

      {/* Search + Filter */}
      <div className="sticky top-16 z-40 bg-white border-b border-gray-100 shadow-sm shadow-gray-100/60">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
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
            <p className="hidden sm:block text-sm text-gray-400 shrink-0">{filtered.length} students</p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {GRADE_FILTERS.map(g => (
              <button
                key={g}
                onClick={() => setActiveGrade(g)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  activeGrade === g
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-500'
                }`}
              >
                {g === 'All' ? 'All Grades' : `Grade ${g}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-10">
        {filtered.length === 0 ? (
          <div className="text-center py-32">
            <p className="font-display text-xl font-bold text-gray-700 mb-1">No students found</p>
            <p className="text-gray-400 text-sm">Try a different search</p>
            <button onClick={() => { setSearch(''); setActiveGrade('All') }} className="btn-outline mt-6">Clear filters</button>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: (i % 5) * 0.05 }}
              >
                <Link
                  href={`/portfolio/${s.username}`}
                  className="block bg-white rounded-2xl p-5 border border-gray-100 hover:border-brand-200 hover:shadow-md transition-all group text-center"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-sm group-hover:scale-105 transition-transform"
                    style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
                  >
                    {(s.first_name?.[0] || 'S').toUpperCase()}
                  </div>
                  <p className="font-bold text-gray-900 text-sm truncate">{s.first_name} {s.last_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">Grade {s.grade} · {s.class}</p>
                  <p className="text-xs text-brand-500 font-medium mt-2.5 group-hover:underline">View Portfolio →</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
