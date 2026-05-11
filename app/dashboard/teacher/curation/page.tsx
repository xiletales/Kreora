'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Palette, Download, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageTransition from '@/components/PageTransition'
import ClassFilterTabs, { ALL_CLASSES } from '@/components/ClassFilterTabs'
import Pagination from '@/components/Pagination'
import SearchInput from '@/components/SearchInput'

const PAGE_SIZE = 12

interface Artwork {
  id: string
  studentName: string
  studentClass: string
  nisn: string
  assignmentId: string
  assignmentTitle: string
  category: string
  fileUrl: string | null
  submittedAt: string
  grade: string | null
  published: boolean
  toggling: boolean
}

const DATE_FILTERS = ['All', 'This Week', 'This Month'] as const
const GRADE_FILTERS = ['All', 'A', 'B', 'C', 'D', 'Ungraded'] as const
type DateFilter = typeof DATE_FILTERS[number]
type GradeFilter = typeof GRADE_FILTERS[number]

function statusBadge(published: boolean) {
  return published
    ? { label: 'Published', cls: 'bg-[#dcfce7] text-[#166534]' }
    : { label: 'Pending',   cls: 'bg-[#fef9c3] text-[#854d0e]' }
}

const filterSelectCls = 'text-xs font-medium text-gray-800 bg-white border border-brand-green-dark rounded-lg px-3 py-1.5 outline-none focus:border-brand-pink-dark transition-colors'

export default function CurationPage() {
  const { user } = useAuth()
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)

  const [activeClass, setActiveClass] = useState(ALL_CLASSES)
  const [filterAssignment, setFilterAssignment] = useState<string>('All')
  const [filterDate, setFilterDate] = useState<DateFilter>('All')
  const [filterGrade, setFilterGrade] = useState<GradeFilter>('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [activeClass, filterAssignment, filterDate, filterGrade, search])

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
      .select('id, nisn, file_url, submitted_at, published, grade, assignment_id')
      .in('assignment_id', assignmentIds)
      .order('submitted_at', { ascending: false })

    if (error) {
      toast.error('Failed to load artworks.')
      setLoading(false)
      return
    }

    // 3. Student profiles — by added_by, with fallback by nisn for any orphans
    const submissionNisns = Array.from(new Set((submissions ?? []).map(s => s.nisn)))
    const { data: students } = await supabase
      .from('students')
      .select('nisn, name, grade, class')
      .eq('added_by', user.id)

    const studentMap = new Map<string, { name: string; grade: string; class: string }>()
    ;(students ?? []).forEach(s => studentMap.set(s.nisn, s))

    const missing = submissionNisns.filter(n => !studentMap.has(n))
    if (missing.length > 0) {
      const { data: extra } = await supabase
        .from('students')
        .select('nisn, name, grade, class')
        .in('nisn', missing)
      ;(extra ?? []).forEach(s => studentMap.set(s.nisn, s))
    }

    const built: Artwork[] = (submissions ?? []).map(s => {
      const asgn = assignmentMap[s.assignment_id]
      const st = studentMap.get(s.nisn)
      const classLabel = st ? [st.grade, st.class].filter(Boolean).join(' ').trim() : ''
      return {
        id:               s.id,
        studentName:      st?.name ?? `Student ${s.nisn}`,
        studentClass:     classLabel,
        nisn:             s.nisn,
        assignmentId:     s.assignment_id,
        assignmentTitle:  asgn?.title ?? 'Assignment',
        category:         asgn?.category ?? '',
        fileUrl:          s.file_url,
        submittedAt:      s.submitted_at,
        grade:            s.grade ?? null,
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

  const classList = useMemo(() => {
    const set = new Set<string>()
    artworks.forEach(a => { if (a.studentClass) set.add(a.studentClass) })
    return Array.from(set).sort()
  }, [artworks])

  const assignmentOptions = useMemo(() => {
    const map = new Map<string, string>()
    artworks.forEach(a => { if (!map.has(a.assignmentId)) map.set(a.assignmentId, a.assignmentTitle) })
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }))
  }, [artworks])

  const visibleArtworks = useMemo(() => {
    const now = Date.now()
    const week  = now - 7  * 86_400_000
    const month = now - 30 * 86_400_000

    let arr = artworks
    if (activeClass !== ALL_CLASSES) arr = arr.filter(a => a.studentClass === activeClass)
    if (filterAssignment !== 'All') arr = arr.filter(a => a.assignmentId === filterAssignment)
    if (filterDate !== 'All') {
      arr = arr.filter(a => {
        const t = new Date(a.submittedAt).getTime()
        if (filterDate === 'This Week')  return t >= week
        if (filterDate === 'This Month') return t >= month
        return true
      })
    }
    if (filterGrade !== 'All') {
      arr = arr.filter(a => filterGrade === 'Ungraded' ? !a.grade : a.grade === filterGrade)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      arr = arr.filter(a =>
        a.studentName.toLowerCase().includes(q) ||
        a.assignmentTitle.toLowerCase().includes(q),
      )
    }
    return arr
  }, [artworks, activeClass, filterAssignment, filterDate, filterGrade, search])

  const totalPages = Math.max(1, Math.ceil(visibleArtworks.length / PAGE_SIZE))
  const pagedArtworks = useMemo(
    () => visibleArtworks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visibleArtworks, page],
  )

  const publishedCount = artworks.filter(a => a.published).length

  return (
    <PageTransition className="p-6 w-full">
      <div className="mb-8 pl-4 border-l-4 border-brand-green-dark">
        <h1 className="text-2xl font-bold text-gray-800">Curation</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          {loading ? '' : `${publishedCount} of ${artworks.length} artworks published`}
        </p>
      </div>

      {!loading && artworks.length > 0 && (
        <>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by student name or assignment title…"
            className="max-w-sm mb-3"
          />
          <ClassFilterTabs
            classes={classList}
            selected={activeClass}
            onChange={setActiveClass}
            className="mb-4"
          />

          <div className="flex flex-wrap items-center gap-3 mb-5 px-1">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 font-medium">Assignment</label>
              <select
                className={filterSelectCls}
                value={filterAssignment}
                onChange={e => setFilterAssignment(e.target.value)}
              >
                <option value="All">All</option>
                {assignmentOptions.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 font-medium">Submitted</label>
              <select
                className={filterSelectCls}
                value={filterDate}
                onChange={e => setFilterDate(e.target.value as DateFilter)}
              >
                {DATE_FILTERS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 font-medium">Grade</label>
              <select
                className={filterSelectCls}
                value={filterGrade}
                onChange={e => setFilterGrade(e.target.value as GradeFilter)}
              >
                {GRADE_FILTERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <span className="text-xs text-gray-600 ml-auto">
              Showing {visibleArtworks.length} of {artworks.length} artworks
            </span>
          </div>
        </>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-brand-green-dark rounded-xl overflow-hidden animate-pulse">
              <div className="h-40 bg-brand-off-white" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-brand-off-white rounded w-2/3" />
                <div className="h-3 bg-brand-off-white rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : artworks.length === 0 ? (
        <div className="text-center py-24 bg-white border border-brand-green-dark rounded-xl shadow-sm">
          <div className="w-12 h-12 bg-brand-off-white rounded-xl flex items-center justify-center mx-auto mb-3">
            <Palette size={20} className="text-gray-600" />
          </div>
          <p className="font-semibold text-gray-800">No artworks to curate yet.</p>
          <p className="text-sm text-gray-600 mt-1">Artworks appear here once students submit their work.</p>
        </div>
      ) : visibleArtworks.length === 0 ? (
        <div className="text-center py-16 bg-white border border-brand-green-dark rounded-xl shadow-sm">
          <p className="text-sm text-gray-600">No artworks match the current filters.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pagedArtworks.map(art => {
            const badge = statusBadge(art.published)
            return (
              <div key={art.id} className="bg-white border border-brand-green-dark rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="h-40 bg-brand-off-white flex items-center justify-center relative overflow-hidden">
                  {art.fileUrl ? (
                    <img
                      src={art.fileUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <Palette size={28} className="text-gray-600/30" />
                  )}
                  <span className={`absolute top-2.5 right-2.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${badge.cls}`}>
                    {badge.label}
                  </span>
                  {art.grade && (
                    <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-gray-800">
                      {art.grade}
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <p className="font-semibold text-gray-800 text-sm truncate">{art.assignmentTitle}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-800 font-medium">{art.studentName}</span>
                    {art.studentClass && (
                      <span className="text-[10px] font-semibold text-brand-green-dark bg-brand-green px-2 py-0.5 rounded-full">
                        {art.studentClass}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">NISN {art.nisn}</p>
                  {art.category && (
                    <span className="text-[10px] text-gray-600 mt-0.5">{art.category}</span>
                  )}
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {new Date(art.submittedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>

                  <div className="flex items-center gap-2 mt-auto pt-3">
                    {art.fileUrl && (
                      <a
                        href={art.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium text-gray-600 border border-brand-green-dark px-2.5 py-1.5 rounded-lg hover:bg-brand-off-white transition-colors"
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
                          : 'bg-brand-green-dark text-white hover:bg-green-400'
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

      {!loading && visibleArtworks.length > 0 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </PageTransition>
  )
}
