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
      <div className="text-center py-20 text-gray-600">
        <Eye size={32} className="mx-auto mb-3 text-brand-pink-dark" />
        <p className="text-sm">No submissions yet.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {submissions.map(sub => (
          <div
            key={sub.id}
            className="bg-white border border-brand-green-dark rounded-2xl p-5 hover:border-brand-pink-dark transition-colors"
          >
            <div
              onClick={() => setModal(sub)}
              className="w-full h-32 bg-gradient-to-br from-brand-pink to-brand-green rounded-xl mb-4 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
            >
              {sub.file_url
                ? <img src={sub.file_url} alt={sub.assignment_title} className="w-full h-full object-cover" />
                : <Eye size={22} className="text-brand-pink-dark" />
              }
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3
                  className="text-sm font-semibold text-gray-800 truncate cursor-pointer hover:text-brand-pink-dark"
                  onClick={() => setModal(sub)}
                >
                  {sub.assignment_title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(sub.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              {sub.grade && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${GRADE_COLOR[sub.grade] ?? 'text-gray-700 bg-gray-100'}`}>
                  {sub.grade}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-brand-green">
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span className="flex items-center gap-1"><Heart size={12} className="text-brand-pink-dark" /> {sub.like_count}</span>
                <span className="flex items-center gap-1"><MessageSquare size={12} className="text-brand-green-dark" /> {sub.feedbacks.length}</span>
              </div>

              <button
                onClick={() => togglePublish(sub)}
                disabled={toggling === sub.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${
                  sub.is_published
                    ? 'bg-brand-green-dark text-white hover:bg-green-400'
                    : 'border border-brand-pink-dark text-brand-pink-dark hover:bg-brand-pink'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-800/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">

            <div className="flex items-start justify-between p-6 pb-4 border-b border-brand-green">
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-800 truncate">{modal.assignment_title}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {modal.grade && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GRADE_COLOR[modal.grade] ?? 'text-gray-700 bg-gray-100'}`}>
                      Grade: {modal.grade}
                    </span>
                  )}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${modal.is_published ? 'bg-brand-green text-brand-green-dark' : 'bg-brand-pink text-brand-pink-dark'}`}>
                    {modal.is_published ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-gray-800 ml-3 shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {modal.file_url ? (
                <a
                  href={modal.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 bg-brand-pink/40 border border-brand-pink-dark/40 rounded-xl text-sm font-medium text-brand-pink-dark hover:bg-brand-pink/70 transition-colors"
                >
                  <ExternalLink size={15} />
                  View Submission File
                </a>
              ) : (
                <p className="text-sm text-gray-600">File not available.</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5"><Heart size={14} className="text-brand-pink-dark" /> {modal.like_count} like{modal.like_count === 1 ? '' : 's'}</span>
                <span className="flex items-center gap-1.5"><MessageSquare size={14} className="text-brand-green-dark" /> {modal.feedbacks.length} feedback</span>
              </div>

              <button
                onClick={() => togglePublish(modal)}
                disabled={toggling === modal.id}
                className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                  modal.is_published
                    ? 'border border-brand-pink-dark text-brand-pink-dark hover:bg-brand-pink'
                    : 'bg-brand-green-dark text-white hover:bg-green-400'
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
                  <h3 className="text-xs font-semibold text-brand-pink-dark uppercase tracking-widest mb-3">Teacher Feedback</h3>
                  <div className="space-y-2">
                    {modal.feedbacks.map(f => (
                      <div key={f.id} className="bg-brand-pink/30 border border-brand-pink-dark/30 rounded-xl p-3">
                        <p className="text-sm text-gray-800">{f.comment}</p>
                        <p className="text-xs text-gray-500 mt-1.5">
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
