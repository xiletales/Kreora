'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Send, Download, MessageSquare, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

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

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data: students } = await supabase
      .from('students')
      .select('nisn, name, grade, class')
      .eq('teacher_id', user.id)

    if (!students || students.length === 0) { setLoading(false); return }

    const nisns = students.map(s => s.nisn)
    const studentMap = Object.fromEntries(students.map(s => [s.nisn, s]))

    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, nisn, file_url, submitted_at, assignment_id, assignments(title, category)')
      .in('nisn', nisns)
      .order('submitted_at', { ascending: false })

    if (error || !submissions) { setLoading(false); return }

    const subIds = submissions.map(s => s.id)
    let fbMap: Record<string, FeedbackEntry[]> = {}

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

    const merged: SubmissionItem[] = submissions.map((s: any) => {
      const asgn = Array.isArray(s.assignments) ? s.assignments[0] : s.assignments
      const st = studentMap[s.nisn]
      return {
        id:                   s.id,
        nisn:                 s.nisn,
        file_url:             s.file_url,
        submitted_at:         s.submitted_at,
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

    const { data, error } = await supabase
      .from('feedbacks')
      .insert({ submission_id: submissionId, teacher_id: user.id, comment })
      .select('id, submission_id, comment, created_at')
      .single()

    setSending(prev => { const n = new Set(prev); n.delete(submissionId); return n })

    if (error) {
      toast.error('Failed to save feedback.')
      setItems(prev => prev.map(item =>
        item.id === submissionId
          ? { ...item, feedbacks: item.feedbacks.filter(f => f.id !== tempId) }
          : item
      ))
      return
    }

    setItems(prev => prev.map(item =>
      item.id === submissionId
        ? { ...item, feedbacks: item.feedbacks.map(f => f.id === tempId ? (data as FeedbackEntry) : f) }
        : item
    ))
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-8 pl-4 border-l-4 border-[#337357]">
        <h1 className="text-2xl font-bold text-[#1a2e25]">Feedback</h1>
        <p className="text-sm text-[#5a7a6a] mt-0.5">Review and comment on student submissions</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E5EDE9] rounded-xl p-5 space-y-3 animate-pulse">
              <div className="h-4 bg-[#F8FAF9] rounded w-1/3" />
              <div className="h-3 bg-[#F8FAF9] rounded w-2/3" />
              <div className="h-12 bg-[#F8FAF9] rounded-xl" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 bg-white border border-[#E5EDE9] rounded-xl shadow-sm">
          <div className="w-12 h-12 bg-[#F8FAF9] rounded-xl flex items-center justify-center mx-auto mb-3">
            <MessageSquare size={20} className="text-[#5a7a6a]" />
          </div>
          <p className="font-semibold text-[#1a2e25]">No submissions to review yet.</p>
          <p className="text-sm text-[#5a7a6a] mt-1">Submissions from your students will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => {
            const isSending = sending.has(item.id)
            const val = inputs[item.id] ?? ''
            return (
              <div key={item.id} className="bg-white border border-[#E5EDE9] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="px-5 py-4 flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
                  >
                    {item.student_name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1a2e25] text-sm">{item.student_name}</span>
                      <span className="text-[10px] font-semibold text-[#5a7a6a] bg-[#F8FAF9] border border-[#E5EDE9] px-2 py-0.5 rounded-full">
                        Grade {item.student_grade} · Class {item.student_class}
                      </span>
                    </div>
                    <p className="text-xs text-[#5a7a6a] mt-0.5">
                      {item.assignment_title}
                      {item.assignment_category ? ` · ${item.assignment_category}` : ''}
                    </p>
                    <p className="text-xs text-[#5a7a6a]/60 mt-0.5">Submitted {fmt(item.submitted_at)}</p>
                  </div>
                  {item.file_url && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-[#337357] border border-[#337357]/20 bg-[#337357]/5 px-3 py-1.5 rounded-lg hover:bg-[#337357]/10 transition-colors"
                    >
                      <Download size={12} /> File
                    </a>
                  )}
                </div>

                <div className="border-t border-[#E5EDE9] px-5 pt-3 pb-4">
                  {item.feedbacks.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {item.feedbacks.map(fb => (
                        <div key={fb.id} className="flex gap-2.5">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5"
                            style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}
                          >
                            T
                          </div>
                          <div className="flex-1 bg-[#337357]/5 border border-[#337357]/10 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[#337357]">You</span>
                              <span className="text-[10px] text-[#5a7a6a]">{fmt(fb.created_at)}</span>
                            </div>
                            <p className="text-sm text-[#1a2e25] mt-0.5 leading-relaxed">{fb.comment}</p>
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
                      className="flex-1 text-sm bg-[#F8FAF9] border border-[#E5EDE9] rounded-full px-4 py-2 outline-none focus:bg-white focus:border-[#337357] transition-all disabled:opacity-60 placeholder-[#5a7a6a]/50 text-[#1a2e25]"
                    />
                    <button
                      onClick={() => handleSend(item.id)}
                      disabled={isSending || !val.trim()}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-[#337357] text-white hover:bg-[#285e46] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
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
    </div>
  )
}
