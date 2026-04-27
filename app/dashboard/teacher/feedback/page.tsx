'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Send, Download, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Student {
  nisn: string
  name: string
  grade: string
  class: string
}

interface Feedback {
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
  assignment_id: string
  assignment_title: string
  assignment_category: string
  student: Student | null
  feedbacks: Feedback[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CLASS_TABS = ['A', 'B', 'C']

const CAT_CLS: Record<string, string> = {
  Ilustrasi: 'cat-illustration',
  Fotografi: 'cat-poster',
  Desain: 'cat-digital',
  Kerajinan: 'cat-painting',
  Lukisan: 'cat-painting',
  'Digital Art': 'cat-digital',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState('A')
  const [items, setItems] = useState<SubmissionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Per-submission comment input state
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  // Set of submission IDs currently being submitted
  const [submitting, setSubmitting] = useState<Set<string>>(new Set())

  const loadClass = useCallback(async (cls: string) => {
    if (!user) return
    setLoading(true)
    setError(null)
    setItems([])

    // 1. Get students for this teacher in this class
    const { data: students, error: sErr } = await supabase
      .from('students')
      .select('nisn, name, grade, class')
      .eq('added_by', user.id)
      .eq('class', cls)

    if (sErr) { setError('Gagal memuat data siswa.'); setLoading(false); return }
    if (!students || students.length === 0) { setLoading(false); return }

    const nisns = students.map(s => s.nisn)
    const studentMap = Object.fromEntries(students.map(s => [s.nisn, s]))

    // 2. Get submissions for these students with assignment data
    const { data: submissions, error: subErr } = await supabase
      .from('submissions')
      .select('id, nisn, file_url, submitted_at, assignment_id, assignments(title, category)')
      .in('nisn', nisns)
      .order('submitted_at', { ascending: false })

    if (subErr) { setError('Gagal memuat data pengumpulan.'); setLoading(false); return }
    if (!submissions || submissions.length === 0) { setLoading(false); return }

    const subIds = submissions.map(s => s.id)

    // 3. Get feedbacks for these submissions
    const { data: feedbacks } = await supabase
      .from('feedbacks')
      .select('id, submission_id, comment, created_at')
      .in('submission_id', subIds)
      .order('created_at', { ascending: true })

    // 4. Group feedbacks by submission
    const fbMap: Record<string, Feedback[]> = {}
    ;(feedbacks ?? []).forEach(f => {
      if (!fbMap[f.submission_id]) fbMap[f.submission_id] = []
      fbMap[f.submission_id].push(f)
    })

    // 5. Merge into items
    const merged: SubmissionItem[] = submissions.map(s => {
      const asgn = s.assignments as { title: string; category: string } | null
      return {
        id: s.id,
        nisn: s.nisn,
        file_url: s.file_url,
        submitted_at: s.submitted_at,
        assignment_id: s.assignment_id,
        assignment_title: asgn?.title ?? 'Tugas',
        assignment_category: asgn?.category ?? '',
        student: studentMap[s.nisn] ?? null,
        feedbacks: fbMap[s.id] ?? [],
      }
    })

    setItems(merged)
    setLoading(false)
  }, [user])

  useEffect(() => { loadClass(activeTab) }, [loadClass, activeTab])

  async function handleSendComment(submissionId: string) {
    const comment = commentInputs[submissionId]?.trim()
    if (!comment || !user) return

    const tempId = `tmp-${Date.now()}`

    // Optimistic: add comment immediately
    setItems(prev => prev.map(item =>
      item.id === submissionId
        ? { ...item, feedbacks: [...item.feedbacks, { id: tempId, submission_id: submissionId, comment, created_at: new Date().toISOString() }] }
        : item
    ))
    setCommentInputs(prev => ({ ...prev, [submissionId]: '' }))
    setSubmitting(prev => new Set(prev).add(submissionId))

    const { data, error: err } = await supabase
      .from('feedbacks')
      .insert({ submission_id: submissionId, teacher_id: user.id, comment })
      .select('id, submission_id, comment, created_at')
      .single()

    setSubmitting(prev => { const n = new Set(prev); n.delete(submissionId); return n })

    if (err) {
      toast.error('Gagal mengirim komentar')
      // Revert optimistic entry
      setItems(prev => prev.map(item =>
        item.id === submissionId
          ? { ...item, feedbacks: item.feedbacks.filter(f => f.id !== tempId) }
          : item
      ))
      return
    }

    // Replace temp with real DB record
    setItems(prev => prev.map(item =>
      item.id === submissionId
        ? { ...item, feedbacks: item.feedbacks.map(f => f.id === tempId ? (data as Feedback) : f) }
        : item
    ))
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl">

      {/* ── Header ── */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Guru Dashboard</p>
        <h1 className="font-display text-2xl font-bold text-gray-900">Feedback</h1>
        <p className="text-sm text-gray-400 mt-1">Berikan komentar pada pengumpulan siswa.</p>
      </div>

      {/* ── Class tabs ── */}
      <div className="flex items-center gap-2 mb-6">
        {CLASS_TABS.map(cls => (
          <button
            key={cls}
            onClick={() => setActiveTab(cls)}
            className={`px-5 py-2 rounded-full text-sm font-medium border transition-all ${
              activeTab === cls
                ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-500'
            }`}
          >
            Kelas {cls}
          </button>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
              <div className="h-5 skeleton w-1/3 rounded" />
              <div className="h-4 skeleton w-2/3 rounded" />
              <div className="h-16 skeleton rounded-xl" />
            </div>
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="text-center py-24">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={22} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700">Belum ada pengumpulan</p>
          <p className="text-sm text-gray-400 mt-1">Pengumpulan dari Kelas {activeTab} akan muncul di sini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => {
            const isSending = submitting.has(item.id)
            const commentVal = commentInputs[item.id] ?? ''
            const catCls = CAT_CLS[item.assignment_category] || 'cat-digital'

            return (
              <div key={item.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-colors">

                {/* Submission header */}
                <div className="px-5 py-4 flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
                  >
                    {(item.student?.name?.[0] || '?').toUpperCase()}
                  </div>

                  {/* Student + assignment info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{item.student?.name ?? 'Siswa'}</span>
                      {item.student && (
                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          Kelas {item.student.grade} {item.student.class}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`pill text-[10px] ${catCls}`}>{item.assignment_category}</span>
                      <span className="text-xs text-gray-600 font-medium">{item.assignment_title}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Dikumpulkan {fmtDate(item.submitted_at)} · {fmtTime(item.submitted_at)}
                    </p>
                  </div>

                  {/* File link */}
                  {item.file_url && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-brand-600 border border-brand-200 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors"
                    >
                      <Download size={12} /> File
                    </a>
                  )}
                </div>

                {/* Comments section */}
                <div className="border-t border-gray-50 px-5 pt-3 pb-4">
                  {/* Existing feedback list */}
                  {item.feedbacks.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {item.feedbacks.map(fb => (
                        <div key={fb.id} className="flex gap-2.5">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5"
                            style={{ background: 'linear-gradient(135deg, #E27396, #c85a7e)' }}
                          >
                            G
                          </div>
                          <div className="flex-1 bg-brand-50 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-brand-700">Guru</span>
                              <span className="text-[10px] text-gray-400">{fmtDate(fb.created_at)}</span>
                            </div>
                            <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{fb.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment input */}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Tulis feedback untuk siswa ini..."
                      value={commentVal}
                      onChange={e => setCommentInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendComment(item.id)}
                      disabled={isSending}
                      className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-full px-4 py-2 outline-none focus:bg-white focus:border-brand-300 focus:shadow-[0_0_0_3px_rgba(51,115,87,0.1)] transition-all disabled:opacity-60 placeholder-gray-400"
                    />
                    <button
                      onClick={() => handleSendComment(item.id)}
                      disabled={isSending || !commentVal.trim()}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      {isSending
                        ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        : <Send size={14} />
                      }
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
