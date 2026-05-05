'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Palette, Download, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '@/components/PageTransition'

interface Artwork {
  id: string
  studentName: string
  nisn: string
  assignmentTitle: string
  category: string
  fileUrl: string | null
  submittedAt: string
  published: boolean
  toggling: boolean
}

function statusBadge(published: boolean) {
  return published
    ? { label: 'Published', cls: 'bg-[#dcfce7] text-[#166534]' }
    : { label: 'Pending',   cls: 'bg-[#fef9c3] text-[#854d0e]' }
}

export default function CurationPage() {
  const { user } = useAuth()
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // 1. This teacher's assignments
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title, category')
      .eq('teacher_id', user.id)

    if (!assignments || assignments.length === 0) {
      setArtworks([])
      setLoading(false)
      return
    }
    const assignmentMap = Object.fromEntries(assignments.map(a => [a.id, a]))
    const assignmentIds = assignments.map(a => a.id)

    // 2. Submissions for those assignments
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, nisn, file_url, submitted_at, published, assignment_id')
      .in('assignment_id', assignmentIds)
      .order('submitted_at', { ascending: false })

    if (error) {
      toast.error('Failed to load artworks.')
      setLoading(false)
      return
    }

    // 3. Student names (for display) — by added_by
    const { data: students } = await supabase
      .from('students')
      .select('nisn, name')
      .eq('added_by', user.id)
    const studentMap = Object.fromEntries((students ?? []).map(s => [s.nisn, s.name]))

    const built: Artwork[] = (submissions ?? []).map(s => {
      const asgn = assignmentMap[s.assignment_id]
      return {
        id:               s.id,
        studentName:      studentMap[s.nisn] ?? 'Student',
        nisn:             s.nisn,
        assignmentTitle:  asgn?.title ?? 'Assignment',
        category:         asgn?.category ?? '',
        fileUrl:          s.file_url,
        submittedAt:      s.submitted_at,
        published:        s.published ?? false,
        toggling:         false,
      }
    })

    setArtworks(built)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function togglePublish(id: string, current: boolean) {
    setArtworks(prev => prev.map(a => a.id === id ? { ...a, toggling: true } : a))

    const { error } = await supabase
      .from('submissions')
      .update({ published: !current })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status.')
      setArtworks(prev => prev.map(a => a.id === id ? { ...a, toggling: false } : a))
      return
    }

    setArtworks(prev => prev.map(a =>
      a.id === id ? { ...a, published: !current, toggling: false } : a
    ))
    toast.success(!current ? 'Artwork published.' : 'Artwork unpublished.')
  }

  const publishedCount = artworks.filter(a => a.published).length

  return (
    <PageTransition className="p-6 w-full">
      <div className="mb-8 pl-4 border-l-4 border-[#337357]">
        <h1 className="text-2xl font-bold text-[#1a2e25]">Curation</h1>
        <p className="text-sm text-[#5a7a6a] mt-0.5">
          {loading ? '' : `${publishedCount} of ${artworks.length} artworks published`}
        </p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E5EDE9] rounded-xl overflow-hidden animate-pulse">
              <div className="h-40 bg-[#F8FAF9]" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-[#F8FAF9] rounded w-2/3" />
                <div className="h-3 bg-[#F8FAF9] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : artworks.length === 0 ? (
        <div className="text-center py-24 bg-white border border-[#E5EDE9] rounded-xl shadow-sm">
          <div className="w-12 h-12 bg-[#F8FAF9] rounded-xl flex items-center justify-center mx-auto mb-3">
            <Palette size={20} className="text-[#5a7a6a]" />
          </div>
          <p className="font-semibold text-[#1a2e25]">No artworks to curate yet.</p>
          <p className="text-sm text-[#5a7a6a] mt-1">Artworks appear here once students submit their work.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {artworks.map(art => {
            const badge = statusBadge(art.published)
            return (
              <div key={art.id} className="bg-white border border-[#E5EDE9] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="h-40 bg-[#F8FAF9] flex items-center justify-center relative overflow-hidden">
                  {art.fileUrl ? (
                    <img
                      src={art.fileUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <Palette size={28} className="text-[#5a7a6a]/30" />
                  )}
                  <span className={`absolute top-2.5 right-2.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <p className="font-semibold text-[#1a2e25] text-sm truncate">{art.assignmentTitle}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#5a7a6a]">{art.studentName}</span>
                    <span className="text-[#E5EDE9]">·</span>
                    <span className="text-xs text-[#5a7a6a]">NISN {art.nisn}</span>
                  </div>
                  {art.category && (
                    <span className="text-[10px] text-[#5a7a6a] mt-0.5">{art.category}</span>
                  )}
                  <p className="text-[10px] text-[#5a7a6a]/60 mt-0.5">
                    {new Date(art.submittedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>

                  <div className="flex items-center gap-2 mt-auto pt-3">
                    {art.fileUrl && (
                      <a
                        href={art.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium text-[#5a7a6a] border border-[#E5EDE9] px-2.5 py-1.5 rounded-lg hover:bg-[#F8FAF9] transition-colors"
                      >
                        <Download size={11} /> View
                      </a>
                    )}
                    <button
                      onClick={() => togglePublish(art.id, art.published)}
                      disabled={art.toggling}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 ml-auto ${
                        art.published
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          : 'bg-[#337357] text-white hover:bg-[#285e46]'
                      }`}
                    >
                      {art.toggling
                        ? <Loader2 size={11} className="animate-spin" />
                        : art.published
                        ? <EyeOff size={11} />
                        : <Eye size={11} />
                      }
                      {art.toggling ? '...' : art.published ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PageTransition>
  )
}
