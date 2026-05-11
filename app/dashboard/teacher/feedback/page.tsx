'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Send, Download, MessageSquare, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '@/components/PageTransition'
import ClassFilterTabs, { ALL_CLASSES } from '@/components/ClassFilterTabs'
import Pagination from '@/components/Pagination'
import SearchInput from '@/components/SearchInput'

const PAGE_SIZE = 8

interface FeedbackEntry {
  id: string
  submission_id: string
  comment: string
  created_at: string
}

interface SubmissionItem {
  id: string
  nisn: string
  file_url: string | null
  submitted_at: string
  grade: string | null
  assignment_title: string
  assignment_category: string
  student_name: string
  student_grade: string
  student_class: string
  feedbacks: FeedbackEntry[]
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function FeedbackPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<SubmissionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<Set<string>>(new Set())
  const [activeClass, setActiveClass] = useState(ALL_CLASSES)
  const [savingGrade, setSavingGrade] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [activeClass, search])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // 1. assignments + students are independent — fire in parallel
    const [{ data: assignments }, { data: students }] = await Promise.all([
      supabase.from('assignments').select('id, title, category').eq('teacher_id', user.id),
      supabase.from('students').select('nisn, name, grade, class').eq('added_by', user.id),
    ])

    if (!assignments || assignments.length === 0) {
      setItems([])
      setLoading(false)
      return
    }
    const assignmentMap = Object.fromEntries(assignments.map(a => [a.id, a]))
    const assignmentIds = assignments.map(a => a.id)

    // 2. submissions depend on assignmentIds — must run after
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, nisn, file_url, submitted_at, grade, assignment_id')
      .in('assignment_id', assignmentIds)
      .order('submitted_at', { ascending: false })

    if (error || !submissions) {
      setItems([])
      setLoading(false)
      return
    }

    const studentMap: Record<string, { name: string; grade: string; class: string }> =
      Object.fromEntries((students ?? []).map(s => [s.nisn, s]))

    // 4. Feedback comments on those submissions
    const subIds = submissions.map(s => s.id)
    const fbMap: Record<string, FeedbackEntry[]> = {}

    if (subIds.length > 0) {
      const { data: feedbacks } = await supabase
        .from('feedbacks')
        .select('id, submission_id, comment, created_at')
        .in('submission_id', subIds)
        .order('created_at', { ascending: true })

      ;(feedbacks ?? []).forEach(f => {
        if (!fbMap[f.submission_id]) fbMap[f.submission_id] = []
        fbMap[f.submission_id].push(f)
      })
    }

    const merged: SubmissionItem[] = submissions.map(s => {
      const asgn = assignmentMap[s.assignment_id]
      const st   = studentMap[s.nisn]
      return {
        id:                   s.id,
        nisn:                 s.nisn,
        file_url:             s.file_url,
        submitted_at:         s.submitted_at,
        grade:                s.grade ?? null,
        assignment_title:     asgn?.title ?? 'Assignment',
        assignment_category:  asgn?.category ?? '',
        student_name:         st?.name ?? 'Student',
        student_grade:        st?.grade ?? '',
        student_class:        st?.class ?? '',
        feedbacks:            fbMap[s.id] ?? [],
      }
    })

    setItems(merged)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const teacherClasses = useMemo(() => {
    const set = new Set<string>()
    items.forEach(it => {
      const label = [it.student_grade, it.student_class].filter(Boolean).join(' ').trim()
      if (label) set.add(label)
    })
    return Array.from(set).sort()
  }, [items])

  const visibleItems = useMemo(() => {
    let arr = items
    if (activeClass !== ALL_CLASSES) {
      arr = arr.filter(it => {
        const label = [it.student_grade, it.student_class].filter(Boolean).join(' ').trim()
        return label === activeClass
      })
    }
    const q = search.trim().toLowerCase()
    if (q) {
      arr = arr.filter(it =>
        it.student_name.toLowerCase().includes(q) ||
        it.nisn.toLowerCase().includes(q),
      )
    }
    return arr
  }, [items, activeClass, search])

  const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE))
  const pagedItems = useMemo(
    () => visibleItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visibleItems, page],
  )

  async function handleGrade(submissionId: string, nextGrade: string) {
    const prev = items.find(i => i.id === submissionId)?.grade ?? null
    const grade = prev === nextGrade ? null : nextGrade

    setItems(list => list.map(i => i.id === submissionId ? { ...i, grade } : i))
    setSavingGrade(s => new Set(s).add(submissionId))

    const res = await fetch('/api/teacher/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: submissionId, grade }),
    })

    setSavingGrade(s => { const n = new Set(s); n.delete(submissionId); return n })

    if (!res.ok) {
      setItems(list => list.map(i => i.id === submissionId ? { ...i, grade: prev } : i))
      toast.error('Failed to save grade.')
      return
    }
    toast.success('Grade saved')
  }

  async function handleSend(submissionId: string) {
    const comment = inputs[submissionId]?.trim()
    if (!comment || !user) return

    const tempId = `tmp-${Date.now()}`
    setItems(prev => prev.map(item =>
      item.id === submissionId
        ? { ...item, feedbacks: [...item.feedbacks, { id: tempId, submission_id: submissionId, comment, created_at: new Date().toISOString() }] }
        : item
    ))
    setInputs(prev => ({ ...prev, [submissionId]: '' }))
    setSending(prev => new Set(prev).add(submissionId))

    const res = await fetch('/api/teacher/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: submissionId, comment }),
    })
    const json = await res.json().catch(() => null) as { feedback?: FeedbackEntry } | null

    setSending(prev => { const n = new Set(prev); n.delete(submissionId); return n })

    if (!res.ok || !json?.feedback) {
      toast.error('Failed to save feedback.')
      setItems(prev => prev.map(item =>
        item.id === submissionId
          ? { ...item, feedbacks: item.feedbacks.filter(f => f.id !== tempId) }
          : item
      ))
      return
    }

    const real = json.feedback
    setItems(prev => prev.map(item =>
      item.id === submissionId
        ? { ...item, feedbacks: item.feedbacks.map(f => f.id === tempId ? real : f) }
        : item
    ))
  }

  return (
    <PageTransition className="p-6 w-full">
      <div className="mb-8 pl-4 border-l-4 border-brand-green-dark">
        <h1 className="text-2xl font-bold text-gray-800">Feedback</h1>
        <p className="text-sm text-gray-600 mt-0.5">Review and comment on student submissions</p>
      </div>

      {!loading && items.length > 0 && (
        <div className="space-y-3 mb-5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by student name or NISN…"
            className="max-w-sm"
          />
          <ClassFilterTabs
            classes={teacherClasses}
            selected={activeClass}
            onChange={setActiveClass}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-brand-green-dark rounded-xl p-5 space-y-3 animate-pulse">
              <div className="h-4 bg-brand-off-white rounded w-1/3" />
              <div className="h-3 bg-brand-off-white rounded w-2/3" />
              <div className="h-12 bg-brand-off-white rounded-xl" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 bg-white border border-brand-green-dark rounded-xl shadow-sm">
          <div className="w-12 h-12 bg-brand-off-white rounded-xl flex items-center justify-center mx-auto mb-3">
            <MessageSquare size={20} className="text-gray-600" />
          </div>
          <p className="font-semibold text-gray-800">No submissions to review yet.</p>
          <p className="text-sm text-gray-600 mt-1">Submissions from your students will appear here.</p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="text-center py-16 bg-white border border-brand-green-dark rounded-xl shadow-sm">
          <p className="text-sm text-gray-600">No submissions for {activeClass}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pagedItems.map(item => {
            const isSending = sending.has(item.id)
            const val = inputs[item.id] ?? ''
            return (
              <div key={item.id} className="bg-white border border-brand-green-dark rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="px-5 py-4 flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-brand-pink-dark text-sm font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #F9D5E5, #F0A8C4)' }}
                  >
                    {item.student_name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm">{item.student_name}</span>
                      <span className="text-[10px] font-semibold text-gray-600 bg-brand-off-white border border-brand-green-dark px-2 py-0.5 rounded-full">
                        NISN {item.nisn}
                      </span>
                      {item.student_grade && (
                        <span className="text-[10px] font-semibold text-gray-600 bg-brand-off-white border border-brand-green-dark px-2 py-0.5 rounded-full">
                          Grade {item.student_grade} · Class {item.student_class}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {item.assignment_title}
                      {item.assignment_category ? ` · ${item.assignment_category}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Submitted {fmt(item.submitted_at)}</p>
                  </div>
                  {item.file_url && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-brand-green-dark border border-brand-green-dark/40 bg-brand-green/40 px-3 py-1.5 rounded-lg hover:bg-brand-green transition-colors"
                    >
                      <Download size={12} /> File
                    </a>
                  )}
                </div>

                <div className="border-t border-brand-green-dark px-5 pt-3 pb-4">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-pink-dark">Grade</span>
                    {(['A', 'B', 'C', 'D'] as const).map(g => {
                      const active = item.grade === g
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => handleGrade(item.id, g)}
                          disabled={savingGrade.has(item.id)}
                          className={`min-w-[2rem] px-2.5 py-1 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${
                            active
                              ? 'bg-brand-green-dark text-white border border-brand-green-dark'
                              : 'bg-white border border-brand-green-dark text-gray-700 hover:bg-brand-green'
                          }`}
                        >
                          {g}
                        </button>
                      )
                    })}
                    {savingGrade.has(item.id) && <Loader2 size={12} className="animate-spin text-gray-500" />}
                  </div>

                  {item.feedbacks.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {item.feedbacks.map(fb => (
                        <div key={fb.id} className="flex gap-2.5">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center bg-brand-pink text-brand-pink-dark text-[10px] font-bold shrink-0 mt-0.5"
                          >
                            T
                          </div>
                          <div className="flex-1 bg-brand-green/40 border border-brand-green-dark/40 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-brand-green-dark">You</span>
                              <span className="text-[10px] text-gray-600">{fmt(fb.created_at)}</span>
                            </div>
                            <p className="text-sm text-gray-800 mt-0.5 leading-relaxed">{fb.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Write feedback for this student..."
                      value={val}
                      onChange={e => setInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(item.id)}
                      disabled={isSending}
                      className="flex-1 text-sm bg-brand-off-white border border-brand-green-dark rounded-full px-4 py-2 outline-none focus:bg-white focus:border-brand-green-dark transition-all disabled:opacity-60 placeholder-gray-400 text-gray-800"
                    />
                    <button
                      onClick={() => handleSend(item.id)}
                      disabled={isSending || !val.trim()}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-brand-green-dark text-white hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      {isSending
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Send size={13} />
                      }
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && visibleItems.length > 0 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </PageTransition>
  )
}
