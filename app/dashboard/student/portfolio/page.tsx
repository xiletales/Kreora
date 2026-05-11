'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Image as ImageIcon } from 'lucide-react'

interface Submission {
  id: string
  file_url: string | null
  grade: string | null
  submitted_at: string
  assignments: {
    title: string
    category: string
    description?: string | null
  } | null
}

interface Student {
  nisn: string
  name: string
  grade: string
  class: string
}

const GRADE_COLOR: Record<string, string> = {
  A: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  B: 'bg-blue-50 text-blue-700 border-blue-200',
  C: 'bg-amber-50 text-amber-700 border-amber-200',
  D: 'bg-rose-50 text-rose-700 border-rose-200',
}

export default function StudentPortfolioPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/auth/student-session')
      const { student } = await res.json()
      if (!student?.nisn) {
        setLoading(false)
        return
      }
      setStudent(student)

      const { data: subs } = await supabase
        .from('submissions')
        .select('id, file_url, grade, submitted_at, assignment_id')
        .eq('nisn', student.nisn)
        .eq('published', true)
        .order('submitted_at', { ascending: false })

      if (!subs || subs.length === 0) {
        setSubmissions([])
        setLoading(false)
        return
      }

      const assignmentIds = Array.from(new Set(subs.map(s => s.assignment_id)))
      const { data: asgnRows } = await supabase
        .from('assignments')
        .select('id, title, category, description')
        .in('id', assignmentIds)

      const asgnMap = new Map((asgnRows ?? []).map(a => [a.id, a]))

      const merged: Submission[] = subs.map(s => ({
        id: s.id,
        file_url: s.file_url,
        grade: s.grade,
        submitted_at: s.submitted_at,
        assignments: asgnMap.get(s.assignment_id) ?? null,
      }))

      setSubmissions(merged)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-6 pb-10"
    >
      <div className="mb-8">
        <p className="text-xs font-semibold text-brand-pink-dark uppercase tracking-widest mb-1">Student Dashboard</p>
        <h1 className="text-2xl font-bold text-gray-800">My Portfolio</h1>
        {student && (
          <p className="text-sm text-gray-600 mt-1">
            {student.name} · Class {student.grade} {student.class}
          </p>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-brand-green-dark overflow-hidden animate-pulse"
            >
              <div className="w-full h-48 bg-brand-pink/40" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-16 rounded-full bg-brand-pink/40" />
                <div className="h-4 w-3/4 rounded bg-brand-pink/40" />
              </div>
            </div>
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-brand-green-dark px-6 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-pink flex items-center justify-center mx-auto mb-3">
            <ImageIcon size={20} className="text-brand-pink-dark" />
          </div>
          <p className="font-semibold text-gray-800">No published works yet</p>
          <p className="text-sm text-gray-600 mt-1">
            Submit assignments to build your portfolio.
          </p>
          <Link
            href="/dashboard/student/assignments"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-brand-green-dark text-white text-sm font-medium hover:bg-green-400 transition-colors"
          >
            View Assignments
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {submissions.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/gallery/${s.id}`}
                className="block bg-white rounded-2xl border border-brand-green-dark overflow-hidden hover:shadow-md hover:border-brand-pink-dark transition-all"
              >
                <div className="aspect-[4/3] bg-brand-pink/40 overflow-hidden">
                  {s.file_url ? (
                    <img
                      src={s.file_url}
                      alt={s.assignments?.title ?? 'Submission'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={28} className="text-brand-pink-dark" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-pink text-brand-pink-dark uppercase tracking-wide">
                      {s.assignments?.category ?? 'Submission'}
                    </span>
                    {s.grade && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          GRADE_COLOR[s.grade] ?? 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {s.grade}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-800 text-sm line-clamp-2">
                    {s.assignments?.title ?? 'Untitled'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(s.submitted_at).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
