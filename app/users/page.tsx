'use client'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { Filter, LayoutGrid, List } from 'lucide-react'
import Link from 'next/link'

const DEMO_USERS: Profile[] = [
  { id: '1', username: 'danielle', first_name: 'Danielle', last_name: '', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '2', username: 'irene', first_name: 'Irene', last_name: '', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '3', username: 'james', first_name: 'James', last_name: '', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '4', username: 'kai', first_name: 'Kai', last_name: '', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '5', username: 'karina', first_name: 'Karina', last_name: '', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '6', username: 'lisa', first_name: 'Lisa', last_name: '', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '7', username: 'mark', first_name: 'Mark', last_name: '', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '8', username: 'martin', first_name: 'Martin', last_name: '', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '9', username: 'naura', first_name: 'Naura', last_name: 'Yumna', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '10', username: 'ratu', first_name: 'Ratu', last_name: 'Amelia', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '11', username: 'radiska', first_name: 'Radiska', last_name: 'Rizki', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '12', username: 'sofia', first_name: 'Sofia', last_name: '', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '13', username: 'thomas', first_name: 'Thomas', last_name: '', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '14', username: 'una', first_name: 'Una', last_name: '', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '15', username: 'vera', first_name: 'Vera', last_name: '', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
  { id: '16', username: 'wanda', first_name: 'Wanda', last_name: '', email: '', role: 'student', grade: 'Grade XI DKV 1', class: 'SMK', created_at: '' },
]

const PAGE_SIZE = 16

export default function ListUsersPage() {
  const [users, setUsers] = useState<Profile[]>(DEMO_USERS)
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [sortBy, setSortBy] = useState('Default')

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'student').then(({ data }) => {
      if (data && data.length > 0) setUsers(data as Profile[])
    })
  }, [])

  const totalPages = Math.ceil(users.length / PAGE_SIZE)
  const paginated = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, users.length)

  return (
    <div className="min-h-screen bg-white">

      {/* ─── Banner ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full py-10 px-4 text-center"
        style={{ background: 'linear-gradient(to bottom, #FBBFC4, #FDD5D9)' }}
      >
        <h1 className="font-display text-3xl font-bold text-gray-800">All of our users</h1>
      </motion.div>

      {/* ─── Filter / sort bar ─── */}
      <div className="bg-brand-500/10 border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-rose-600 transition-colors">
            <Filter size={14} /> Filter
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'text-rose-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'text-rose-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List size={15} />
            </button>
          </div>
          <span className="text-sm text-gray-500 flex-1">
            Showing {start}–{end} of {users.length} results
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500 font-medium">Show</span>
            <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600">
              <option>16</option>
              <option>32</option>
            </select>
            <span className="text-xs text-gray-500 font-medium">Sort by</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600"
            >
              <option>Default</option>
              <option>Name A–Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── User List / Grid ─── */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {viewMode === 'list' ? (
          <div className="divide-y divide-gray-100">
            {paginated.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/profile/${u.id}`} className="flex items-center gap-4 py-4 hover:bg-rose-50/50 -mx-2 px-2 rounded-xl transition-colors group">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
                          <circle cx="24" cy="18" r="10" fill="#9CA3AF" />
                          <ellipse cx="24" cy="38" rx="15" ry="10" fill="#9CA3AF" />
                        </svg>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <div className="bg-brand-500 text-white px-3 py-0.5 rounded-full">
                        <span className="text-xs font-bold tracking-widest uppercase">{u.first_name} {u.last_name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {u.grade || 'Grade XI DKV 1'} – {u.class || 'SMK'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {(u as any).subject_specialization || 'Specializes in Illustrations and Poster designs'}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {paginated.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/profile/${u.id}`} className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center hover:border-rose-200 hover:shadow-md transition-all">
                  <div className="w-16 h-16 rounded-full bg-gray-200 mx-auto mb-3 overflow-hidden flex items-center justify-center">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
                          <circle cx="32" cy="24" r="13" fill="#9CA3AF" />
                          <ellipse cx="32" cy="50" rx="20" ry="13" fill="#9CA3AF" />
                        </svg>
                    }
                  </div>
                  <div className="bg-brand-500 text-white px-2 py-0.5 rounded-full inline-block mb-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase">{u.first_name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{u.grade || 'Grade XI DKV 1'}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center gap-2 justify-center mt-10">
          {Array.from({ length: totalPages || 3 }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
                p === page ? 'bg-rose-400 text-white' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'
              }`}
            >
              {p}
            </button>
          ))}
          {page < (totalPages || 3) && (
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-4 h-9 rounded-full text-sm font-semibold bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
