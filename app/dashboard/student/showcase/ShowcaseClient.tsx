'use client'
import { useState } from 'react'
import { X, ExternalLink, Eye, EyeOff, Heart, MessageSquare, Loader2 } from 'lucide-react'

interface Submission {
  id: string
  assignment_id: string
  assignment_title: string
  file_url: string | null
  grade: string | null
  is_published: boolean
  created_at: string
  like_count: number
  feedbacks: { id: string; comment: string; created_at: string }[]
}

const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-600 bg-emerald-50',
  B: 'text-blue-600 bg-blue-50',
  C: 'text-amber-600 bg-amber-50',
  D: 'text-rose-600 bg-rose-50',
}

export default function ShowcaseClient({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [modal, setModal] = useState<Submission | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  async function togglePublish(sub: Submission) {
    setToggling(sub.id)
    const res = await fetch('/api/student/toggle-publish', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: sub.id, is_published: !sub.is_published }),
    })
    setToggling(null)
    if (!res.ok) return

    setSubmissions(prev =>
      prev.map(s => s.id === sub.id ? { ...s, is_published: !s.is_published } : s)
    )
    if (modal?.id === sub.id) {
      setModal(m => m ? { ...m, is_published: !m.is_published } : m)
    }
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-20 text-[#5a7a6a]">
        <Eye size={32} className="mx-auto mb-3 text-[#E27396]" />
        <p className="text-sm">No submissions yet.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {submissions.map(sub => (
          <div
            key={sub.id}
            className="bg-white border border-[#EA9AB2]/40 rounded-2xl p-5 hover:border-[#E27396]/60 transition-colors"
          >
            <div
              onClick={() => setModal(sub)}
              className="w-full h-32 bg-gradient-to-br from-[#FFDBE5] to-[#EA9AB2]/40 rounded-xl mb-4 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
            >
              {sub.file_url
                ? <img src={sub.file_url} alt={sub.assignment_title} className="w-full h-full object-cover" />
                : <Eye size={22} className="text-[#E27396]" />
              }
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3
                  className="text-sm font-semibold text-[#1a2e25] truncate cursor-pointer hover:text-[#E27396]"
                  onClick={() => setModal(sub)}
                >
                  {sub.assignment_title}
                </h3>
                <p className="text-xs text-[#5a7a6a]/80 mt-0.5">
                  {new Date(sub.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              {sub.grade && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${GRADE_COLOR[sub.grade] ?? 'text-gray-600 bg-gray-100'}`}>
                  {sub.grade}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#FFDBE5]">
              <div className="flex items-center gap-3 text-xs text-[#5a7a6a]">
                <span className="flex items-center gap-1"><Heart size={12} className="text-[#E27396]" /> {sub.like_count}</span>
                <span className="flex items-center gap-1"><MessageSquare size={12} className="text-[#337357]" /> {sub.feedbacks.length}</span>
              </div>

              <button
                onClick={() => togglePublish(sub)}
                disabled={toggling === sub.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${
                  sub.is_published
                    ? 'bg-[#337357] text-white hover:bg-[#2a5e47]'
                    : 'bg-[#FFDBE5] text-[#E27396] hover:bg-[#EA9AB2]/40'
                }`}
              >
                {toggling === sub.id
                  ? <Loader2 size={11} className="animate-spin" />
                  : sub.is_published ? <Eye size={11} /> : <EyeOff size={11} />
                }
                {sub.is_published ? 'Public' : 'Private'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a2e25]/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">

            <div className="flex items-start justify-between p-6 pb-4 border-b border-[#FFDBE5]">
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-[#1a2e25] truncate">{modal.assignment_title}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {modal.grade && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GRADE_COLOR[modal.grade] ?? 'text-gray-600 bg-gray-100'}`}>
                      Grade: {modal.grade}
                    </span>
                  )}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${modal.is_published ? 'bg-[#337357]/10 text-[#337357]' : 'bg-[#FFDBE5] text-[#E27396]'}`}>
                    {modal.is_published ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="text-[#5a7a6a] hover:text-[#1a2e25] ml-3 shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {modal.file_url ? (
                <a
                  href={modal.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 bg-[#FFDBE5]/40 border border-[#EA9AB2]/40 rounded-xl text-sm font-medium text-[#E27396] hover:bg-[#FFDBE5]/70 transition-colors"
                >
                  <ExternalLink size={15} />
                  View Submission File
                </a>
              ) : (
                <p className="text-sm text-[#5a7a6a]">File not available.</p>
              )}

              <div className="flex items-center gap-4 text-sm text-[#5a7a6a]">
                <span className="flex items-center gap-1.5"><Heart size={14} className="text-[#E27396]" /> {modal.like_count} like{modal.like_count === 1 ? '' : 's'}</span>
                <span className="flex items-center gap-1.5"><MessageSquare size={14} className="text-[#337357]" /> {modal.feedbacks.length} feedback</span>
              </div>

              <button
                onClick={() => togglePublish(modal)}
                disabled={toggling === modal.id}
                className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                  modal.is_published
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                    : 'bg-[#337357] text-white hover:bg-[#2a5e47]'
                }`}
              >
                {toggling === modal.id
                  ? <Loader2 size={15} className="animate-spin" />
                  : modal.is_published ? <EyeOff size={15} /> : <Eye size={15} />
                }
                {modal.is_published ? 'Make Private' : 'Publish'}
              </button>

              {modal.feedbacks.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[#E27396] uppercase tracking-widest mb-3">Teacher Feedback</h3>
                  <div className="space-y-2">
                    {modal.feedbacks.map(f => (
                      <div key={f.id} className="bg-[#FFDBE5]/30 border border-[#FFDBE5] rounded-xl p-3">
                        <p className="text-sm text-[#1a2e25]">{f.comment}</p>
                        <p className="text-xs text-[#5a7a6a]/80 mt-1.5">
                          {new Date(f.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
