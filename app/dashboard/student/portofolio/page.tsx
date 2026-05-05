'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function StudentPortfolioPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/auth/student-session')
      const { student } = await res.json()
      if (!student) return
      setStudent(student)

      const { data } = await supabase
        .from('submissions')
        .select('*, assignments(title, category, description)')
        .eq('nisn', student.nisn)
        .eq('published', true)

      setSubmissions(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 w-full"
    >
      <div className="mb-6">
        <p className="text-xs font-semibold text-[#E27396] uppercase tracking-widest mb-1">Student Dashboard</p>
        <h1 className="text-2xl font-bold text-[#1a2e25]">My Portfolio</h1>
        <p className="text-sm text-[#6D9F71] mt-1">{student?.name} · Class {student?.grade} {student?.class}</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#6D9F71]">Loading portfolio...</div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-12 text-[#6D9F71]">
          <p className="font-medium">No published works yet.</p>
          <p className="text-sm mt-1">Submit assignments to build your portfolio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {submissions.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.01 }}
            >
              <Link href={`/gallery/${s.id}`} className="block bg-white rounded-xl border border-[#EA9AB2]/30 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <img src={s.file_url} alt={s.assignments?.title} className="w-full h-48 object-cover" />
                <div className="p-4">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FFDBE5] text-[#E27396] mb-2 inline-block">
                    {s.assignments?.category}
                  </span>
                  <p className="font-semibold text-[#1a2e25] text-sm">{s.assignments?.title}</p>
                  {s.grade && (
                    <span className={`text-xs font-bold mt-1 inline-block px-2 py-0.5 rounded-full ${
                      s.grade === 'A' ? 'bg-green-100 text-green-700' :
                      s.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                      s.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>Grade: {s.grade}</span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}