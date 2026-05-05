'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle, Clock, X, Paperclip, Loader2, Calendar, ChevronRight, AlertCircle, ExternalLink } from 'lucide-react'

interface Assignment {
  id: string
  title: string
  deadline: string
  category: string
  description: string | null
  created_at: string
}

interface Submission {
  id: string
  assignment_id: string
  file_url: string | null
  grade: string | null
  submitted_at: string
  feedback: string | null
}

interface Props {
  assignments: Assignment[]
  submissions: Submission[]
}

const CATEGORIES = ['All', 'Illustration', 'Poster', 'Logo', 'Digital', 'Painting', 'Animation']
const STATUSES = ['All', 'Submitted', 'Not Submitted', 'Overdue'] as const
const SORTS = ['Deadline Soonest', 'Newest First'] as const

type Status = typeof STATUSES[number]
type Sort = typeof SORTS[number]

const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-600 bg-emerald-50',
  B: 'text-blue-600 bg-blue-50',
  C: 'text-amber-600 bg-amber-50',
  D: 'text-rose-600 bg-rose-50',
}

function statusOf(deadline: string, submitted: boolean): { label: string; cls: string } {
  if (submitted) return { label: 'Submitted', cls: 'bg-brand-green text-brand-green-dark' }
  const past = new Date(deadline).getTime() < Date.now()
  if (past) return { label: 'Overdue', cls: 'bg-rose-100 text-rose-600' }
  return { label: 'Active', cls: 'bg-brand-pink text-brand-pink-dark' }
}

function daysLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff < 0) return 'Overdue'
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return `${days} day${days === 1 ? '' : 's'} left`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

function CountdownTimer({ deadline }: { deadline: string }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  if (now === null) return null

  const diff = new Date(deadline).getTime() - now
  if (diff <= 0) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-rose-600">
          <AlertCircle size={15} />
          <p className="text-sm font-semibold">Deadline has passed</p>
        </div>
      </div>
    )
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const mins = Math.floor((diff / (1000 * 60)) % 60)

  return (
    <div className="bg-brand-pink/40 border border-brand-pink-dark/40 rounded-xl px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-pink-dark mb-1">Time Remaining</p>
      <div className="flex items-center gap-3 text-gray-800">
        <div>
          <p className="text-2xl font-display font-bold text-brand-green-dark">{days}</p>
          <p className="text-[10px] text-gray-600">days</p>
        </div>
        <span className="text-gray-500">:</span>
        <div>
          <p className="text-2xl font-display font-bold text-brand-green-dark">{hours.toString().padStart(2, '0')}</p>
          <p className="text-[10px] text-gray-600">hours</p>
        </div>
        <span className="text-gray-500">:</span>
        <div>
          <p className="text-2xl font-display font-bold text-brand-green-dark">{mins.toString().padStart(2, '0')}</p>
          <p className="text-[10px] text-gray-600">mins</p>
        </div>
      </div>
    </div>
  )
}

export default function AssignmentsClient({ assignments, submissions }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState<Status>('All')
  const [sort, setSort] = useState<Sort>('Deadline Soonest')

  const [detail, setDetail] = useState<Assignment | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const subMap = useMemo(
    () => new Map(submissions.map(s => [s.assignment_id, s])),
    [submissions],
  )

  const filtered = useMemo(() => {
    let list = [...assignments]

    if (category !== 'All') {
      list = list.filter(a => (a.category ?? '').toLowerCase() === category.toLowerCase())
    }

    if (status !== 'All') {
      list = list.filter(a => {
        const sub = subMap.get(a.id)
        const isSubmitted = !!sub
        const past = new Date(a.deadline).getTime() < Date.now()
        if (status === 'Submitted')     return isSubmitted
        if (status === 'Not Submitted') return !isSubmitted && !past
        if (status === 'Overdue')       return !isSubmitted && past
        return true
      })
    }

    if (sort === 'Deadline Soonest') {
      list.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return list
  }, [assignments, category, status, sort, subMap])

  function openDetail(a: Assignment) {
    setDetail(a)
    setFile(null)
    setError('')
  }

  function closeDetail() {
    setDetail(null)
    setFile(null)
    setError('')
  }

  async function handleSubmit() {
    if (!detail || !file) return
    setLoading(true)
    setError('')

    const form = new FormData()
    form.append('file', file)
    form.append('assignment_id', detail.id)

    const res = await fetch('/api/student/submit', { method: 'POST', body: form })
    const json = await res.json()

    setLoading(false)
    if (!res.ok) {
      setError(json.error ?? 'Failed to submit.')
      return
    }

    closeDetail()
    router.refresh()
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-brand-green-dark rounded-2xl">
        <Clock size={32} className="mx-auto mb-3 text-brand-pink-dark" />
        <p className="text-sm text-gray-800 font-medium">No assignments yet</p>
        <p className="text-xs text-gray-600 mt-1">Your teacher hasn&apos;t posted any assignments.</p>
      </div>
    )
  }

  return (
    <>
      {/* Filters */}
      <div className="bg-white border border-brand-green-dark rounded-2xl p-4 sm:p-5 mb-5 space-y-4">
        <div>
          <p className="text-[10px] font-semibold text-brand-pink-dark uppercase tracking-widest mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  category === c
                    ? 'bg-brand-green-dark text-white'
                    : 'bg-brand-green/40 text-gray-700 hover:bg-brand-green'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold text-brand-pink-dark uppercase tracking-widest mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    status === s
                      ? 'bg-brand-pink-dark text-white'
                      : 'bg-brand-pink/40 text-gray-700 hover:bg-brand-pink'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-brand-pink-dark uppercase tracking-widest mb-2">Sort</p>
            <div className="flex flex-wrap gap-2">
              {SORTS.map(s => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    sort === s
                      ? 'bg-gray-800 text-white'
                      : 'bg-brand-off-white border border-brand-green text-gray-700 hover:bg-brand-green'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-brand-green-dark rounded-2xl">
          <p className="text-sm text-gray-600">No assignments match the current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => {
            const sub = subMap.get(a.id)
            const submitted = !!sub
            const stat = statusOf(a.deadline, submitted)
            const past = new Date(a.deadline).getTime() < Date.now()

            return (
              <button
                key={a.id}
                onClick={() => openDetail(a)}
                className="text-left bg-white border border-brand-green-dark rounded-2xl p-5 hover:border-brand-pink-dark hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {a.category && (
                    <span className="text-[10px] font-semibold text-brand-pink-dark bg-brand-pink px-2 py-0.5 rounded-full">
                      {a.category}
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stat.cls}`}>
                    {stat.label}
                  </span>
                  {sub?.grade && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${GRADE_COLOR[sub.grade] ?? 'text-gray-700 bg-gray-100'}`}>
                      Grade {sub.grade}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-gray-800 group-hover:text-brand-pink-dark transition-colors">{a.title}</h3>

                {a.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{a.description}</p>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-brand-green">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar size={12} className="text-brand-pink-dark" />
                    <span>{formatDate(a.deadline)}</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${past && !submitted ? 'text-rose-600' : 'text-brand-green-dark'}`}>
                    {submitted ? 'Submitted' : daysLeft(a.deadline)}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-1 mt-3 text-brand-pink-dark text-xs font-semibold">
                  <span>View details</span>
                  <ChevronRight size={12} />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail / submit modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-800/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-brand-green">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {detail.category && (
                    <span className="text-[10px] font-semibold text-brand-pink-dark bg-brand-pink px-2 py-0.5 rounded-full">
                      {detail.category}
                    </span>
                  )}
                </div>
                <h2 className="font-semibold text-gray-800 text-lg">{detail.title}</h2>
                <p className="text-xs text-gray-600 mt-1">Due {formatDate(detail.deadline)}</p>
              </div>
              <button onClick={closeDetail} className="text-gray-500 hover:text-gray-800 ml-3 shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              <CountdownTimer deadline={detail.deadline} />

              {detail.description && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-pink-dark mb-2">Description</p>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{detail.description}</p>
                </div>
              )}

              {(() => {
                const sub = subMap.get(detail.id)
                if (!sub) return null
                return (
                  <div className="bg-brand-green/40 border border-brand-green-dark rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={14} className="text-brand-green-dark" />
                      <p className="text-sm font-semibold text-brand-green-dark">You submitted this assignment</p>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">{formatDate(sub.submitted_at)}</p>
                    {sub.file_url && (
                      <a
                        href={sub.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-pink-dark hover:underline"
                      >
                        <ExternalLink size={12} />
                        View your submission
                      </a>
                    )}
                    {sub.grade && (
                      <div className="mt-3 pt-3 border-t border-brand-green-dark/40">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-green-dark mb-1">Grade</p>
                        <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${GRADE_COLOR[sub.grade] ?? 'text-gray-700 bg-gray-100'}`}>
                          {sub.grade}
                        </span>
                      </div>
                    )}
                    {sub.feedback && (
                      <div className="mt-3 pt-3 border-t border-brand-green-dark/40">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-pink-dark mb-1">Teacher Feedback</p>
                        <p className="text-sm text-gray-800">{sub.feedback}</p>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Submit area — hidden once deadline has passed AND no prior submission */}
              {(() => {
                const past = new Date(detail.deadline).getTime() < Date.now()
                const sub = subMap.get(detail.id)
                if (past && !sub) return null

                return (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-pink-dark mb-2">
                      {sub ? 'Resubmit' : 'Submit Your Work'}
                    </p>
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed border-brand-green-dark rounded-xl p-6 text-center cursor-pointer hover:border-brand-pink-dark hover:bg-brand-pink/30 transition-colors"
                    >
                      <Paperclip size={22} className="mx-auto mb-2 text-brand-pink-dark" />
                      {file ? (
                        <p className="text-sm font-medium text-gray-800">{file.name}</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-800">Click to choose a file</p>
                          <p className="text-xs text-gray-600 mt-1">PDF, image, video, or ZIP</p>
                        </>
                      )}
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        onChange={e => setFile(e.target.files?.[0] ?? null)}
                      />
                    </div>

                    {error && <p className="text-xs text-rose-600 mt-3">{error}</p>}

                    <button
                      onClick={handleSubmit}
                      disabled={!file || loading}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 mt-4 text-sm font-semibold bg-brand-green-dark text-white rounded-xl hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                      {loading ? 'Uploading...' : sub ? 'Resubmit' : 'Submit'}
                    </button>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
