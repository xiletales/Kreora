'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle, Clock, X, Paperclip, Loader2 } from 'lucide-react'

interface Assignment {
  id: string
  title: string
  deadline: string
  category: string
  description: string | null
}

interface Submission {
  assignment_id: string
  file_url: string | null
  grade: string | null
}

interface Props {
  assignments: Assignment[]
  submissions: Submission[]
}

function statusBadge(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  const days = diff / (1000 * 60 * 60 * 24)
  if (diff < 0) return { label: 'Overdue', cls: 'bg-rose-100 text-rose-600' }
  if (days <= 3) return { label: 'Soon', cls: 'bg-amber-100 text-amber-600' }
  return { label: 'Active', cls: 'bg-[#337357]/10 text-[#337357]' }
}

const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-600 bg-emerald-50',
  B: 'text-blue-600 bg-blue-50',
  C: 'text-amber-600 bg-amber-50',
  D: 'text-rose-600 bg-rose-50',
}

export default function AssignmentClient({ assignments, submissions }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [modal, setModal] = useState<Assignment | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const subMap = new Map(submissions.map(s => [s.assignment_id, s]))

  function openModal(a: Assignment) {
    setModal(a)
    setFile(null)
    setError('')
  }

  function closeModal() {
    setModal(null)
    setFile(null)
    setError('')
  }

  async function handleSubmit() {
    if (!modal || !file) return
    setLoading(true)
    setError('')

    const form = new FormData()
    form.append('file', file)
    form.append('assignment_id', modal.id)

    const res = await fetch('/api/student/submit', { method: 'POST', body: form })
    const json = await res.json()

    setLoading(false)
    if (!res.ok) {
      setError(json.error ?? 'Failed to submit.')
      return
    }

    closeModal()
    router.refresh()
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <Clock size={32} className="mx-auto mb-3 text-gray-200" />
        <p className="text-sm">No assignments from your teacher yet.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {assignments.map(a => {
          const sub = subMap.get(a.id)
          const badge = statusBadge(a.deadline)
          const submitted = !!sub
          const pastDeadline = new Date(a.deadline).getTime() < Date.now()

          return (
            <div
              key={a.id}
              className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {a.category && (
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        {a.category}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{a.title}</h3>
                  {a.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Deadline:{' '}
                    {new Date(a.deadline).toLocaleDateString('en-US', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {sub?.grade && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${GRADE_COLOR[sub.grade] ?? 'text-gray-600 bg-gray-100'}`}>
                      Grade: {sub.grade}
                    </span>
                  )}

                  {submitted ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-brand-500" />
                      <span className="text-xs font-semibold text-[#337357]">Submitted</span>
                    </div>
                  ) : null}

                  {!pastDeadline && (
                    <button
                      onClick={() => openModal(a)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors"
                    >
                      <Upload size={12} />
                      {submitted ? 'Resubmit' : 'Submit'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Upload modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a2e25]/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">Submit Assignment</h2>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{modal.title}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
            >
              <Paperclip size={22} className="mx-auto mb-2 text-gray-300" />
              {file ? (
                <p className="text-sm font-medium text-gray-700">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-500">Click to choose a file</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, image, video, or ZIP</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {error && <p className="text-xs text-rose-500 mt-3">{error}</p>}

            <div className="flex gap-3 mt-5">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!file || loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {loading ? 'Uploading...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
