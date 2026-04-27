'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Award, Plus, Trash2, X, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubmissionItem {
  id: string
  nisn: string
  file_url: string | null
  submitted_at: string
  assignment_title: string
  assignment_category: string
  student_name: string
  badge: { id: string; badge_type: string } | null
}

interface EventItem {
  id: string
  name: string
  description: string | null
  created_at: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BADGE_TYPES = ['Karya Terbaik', 'Paling Kreatif', 'Teknik Bagus', 'Inovatif'] as const
const EMPTY_EVENT_FORM = { name: '', description: '' }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CurationPage() {
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<'badges' | 'events'>('badges')

  // ── Badge tab state ──
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [badgeSelects, setBadgeSelects] = useState<Record<string, string>>({})
  const [givingBadge, setGivingBadge] = useState<Set<string>>(new Set())

  // ── Events tab state ──
  const [events, setEvents] = useState<EventItem[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM)
  const [savingEvent, setSavingEvent] = useState(false)
  const [deleteEventTarget, setDeleteEventTarget] = useState<EventItem | null>(null)
  const [deletingEvent, setDeletingEvent] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Load all data once ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return
    setError(null)

    // 1. Get students added by this teacher
    const { data: students, error: sErr } = await supabase
      .from('students')
      .select('nisn, name')
      .eq('added_by', user.id)

    if (sErr) { setError('Gagal memuat data siswa.'); setLoading(false); return }

    const nisns = (students ?? []).map(s => s.nisn)
    const studentMap = Object.fromEntries((students ?? []).map(s => [s.nisn, s.name]))

    // 2. Get submissions for those students
    let mergedSubs: SubmissionItem[] = []
    if (nisns.length > 0) {
      const { data: subs, error: subErr } = await supabase
        .from('submissions')
        .select('id, nisn, file_url, submitted_at, assignments(title, category)')
        .in('nisn', nisns)
        .order('submitted_at', { ascending: false })

      if (subErr) { setError('Gagal memuat pengumpulan.'); setLoading(false); return }

      const subIds = (subs ?? []).map(s => s.id)

      // 3. Get badges for those submissions
      let badgeMap: Record<string, { id: string; badge_type: string }> = {}
      if (subIds.length > 0) {
        const { data: badges } = await supabase
          .from('badges')
          .select('id, submission_id, badge_type')
          .in('submission_id', subIds)
        ;(badges ?? []).forEach(b => { badgeMap[b.submission_id] = { id: b.id, badge_type: b.badge_type } })
      }

      mergedSubs = (subs ?? []).map(s => {
        const asgn = s.assignments as { title: string; category: string } | null
        return {
          id: s.id,
          nisn: s.nisn,
          file_url: s.file_url,
          submitted_at: s.submitted_at,
          assignment_title: asgn?.title ?? 'Tugas',
          assignment_category: asgn?.category ?? '',
          student_name: studentMap[s.nisn] ?? 'Siswa',
          badge: badgeMap[s.id] ?? null,
        }
      })
    }

    setSubmissions(mergedSubs)

    // 4. Get events
    const { data: evts, error: eErr } = await supabase
      .from('events')
      .select('id, name, description, created_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (eErr) { setError('Gagal memuat event.'); setLoading(false); return }
    setEvents(evts ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // ── Badge actions ─────────────────────────────────────────────────────────

  async function handleGiveBadge(submissionId: string) {
    const badgeType = badgeSelects[submissionId]
    if (!badgeType || !user) { toast.error('Pilih tipe badge terlebih dahulu'); return }

    setGivingBadge(prev => new Set(prev).add(submissionId))

    const { data, error: err } = await supabase
      .from('badges')
      .insert({ submission_id: submissionId, teacher_id: user.id, badge_type: badgeType, given_at: new Date().toISOString() })
      .select('id, badge_type')
      .single()

    setGivingBadge(prev => { const n = new Set(prev); n.delete(submissionId); return n })

    if (err) { toast.error('Gagal memberi badge'); return }

    setSubmissions(prev => prev.map(s =>
      s.id === submissionId ? { ...s, badge: { id: data.id, badge_type: data.badge_type } } : s
    ))
    toast.success(`Badge "${badgeType}" berhasil diberikan!`)
  }

  // ── Event actions ─────────────────────────────────────────────────────────

  async function handleCreateEvent() {
    if (!eventForm.name.trim()) { toast.error('Nama event wajib diisi'); return }
    if (!user) return
    setSavingEvent(true)

    const { data, error: err } = await supabase
      .from('events')
      .insert({
        teacher_id: user.id,
        name: eventForm.name.trim(),
        description: eventForm.description.trim() || null,
      })
      .select('id, name, description, created_at')
      .single()

    setSavingEvent(false)
    if (err) { toast.error('Gagal membuat event'); return }

    setEvents(prev => [data as EventItem, ...prev])
    setEventForm(EMPTY_EVENT_FORM)
    setShowEventForm(false)
    toast.success('Event berhasil dibuat!')
  }

  async function handleDeleteEvent() {
    if (!deleteEventTarget) return
    setDeletingEvent(true)

    const { error: err } = await supabase
      .from('events')
      .delete()
      .eq('id', deleteEventTarget.id)

    setDeletingEvent(false)
    if (err) { toast.error('Gagal menghapus event'); return }

    setEvents(prev => prev.filter(e => e.id !== deleteEventTarget.id))
    setDeleteEventTarget(null)
    toast.success('Event dihapus.')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 sm:p-8 max-w-4xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Guru Dashboard</p>
          <h1 className="font-display text-2xl font-bold text-gray-900">Kurasi</h1>
        </div>
        {activeTab === 'events' && (
          <button
            onClick={() => setShowEventForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm shadow-brand-200"
          >
            <Plus size={15} /> Buat Event
          </button>
        )}
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex items-center gap-2 mb-6">
        {([['badges', 'Badge Karya'], ['events', 'Event']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-5 py-2 rounded-full text-sm font-medium border transition-all ${
              activeTab === id
                ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: BADGES
      ══════════════════════════════════════════ */}
      {activeTab === 'badges' && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 h-20 skeleton" />
              ))}
            </div>
          ) : submissions.length === 0 && !error ? (
            <div className="text-center py-24">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Award size={22} className="text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">Belum ada pengumpulan</p>
              <p className="text-sm text-gray-400 mt-1">Badge bisa diberikan setelah siswa mengumpulkan karya.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map(sub => (
                <div
                  key={sub.id}
                  className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 hover:border-gray-200 transition-colors"
                >
                  {/* Thumbnail placeholder */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {sub.file_url ? (
                      <img
                        src={sub.file_url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <Award size={18} className="text-gray-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{sub.student_name}</p>
                    <p className="text-xs text-gray-400 truncate">{sub.assignment_title} · {fmtDate(sub.submitted_at)}</p>
                  </div>

                  {/* Badge state */}
                  {sub.badge ? (
                    <span className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-full">
                      <Award size={12} /> {sub.badge.badge_type}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={badgeSelects[sub.id] ?? ''}
                        onChange={e => setBadgeSelects(prev => ({ ...prev, [sub.id]: e.target.value }))}
                        className="text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-300 text-gray-600 bg-white cursor-pointer"
                      >
                        <option value="">Pilih badge...</option>
                        {BADGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button
                        onClick={() => handleGiveBadge(sub.id)}
                        disabled={givingBadge.has(sub.id) || !badgeSelects[sub.id]}
                        className="text-xs font-semibold px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {givingBadge.has(sub.id) ? '...' : 'Beri Badge'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════
          TAB: EVENTS
      ══════════════════════════════════════════ */}
      {activeTab === 'events' && (
        <>
          {/* Create event form */}
          {showEventForm && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 text-sm">Buat Event Baru</h2>
                <button
                  onClick={() => { setShowEventForm(false); setEventForm(EMPTY_EVENT_FORM) }}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Nama Event</label>
                  <input
                    className="kreora-input"
                    placeholder="Contoh: Pameran Karya Semester Ganjil"
                    value={eventForm.name}
                    onChange={e => setEventForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Deskripsi <span className="text-gray-400 font-normal">(opsional)</span>
                  </label>
                  <textarea
                    className="kreora-input resize-none"
                    rows={3}
                    placeholder="Keterangan singkat tentang event ini..."
                    value={eventForm.description}
                    onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => { setShowEventForm(false); setEventForm(EMPTY_EVENT_FORM) }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={savingEvent}
                  className="px-5 py-2 text-sm font-semibold bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-60 transition-colors"
                >
                  {savingEvent ? 'Menyimpan...' : 'Buat Event'}
                </button>
              </div>
            </div>
          )}

          {/* Event list */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 h-20 skeleton" />
              ))}
            </div>
          ) : events.length === 0 && !error ? (
            <div className="text-center py-24">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarDays size={22} className="text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">Belum ada event</p>
              <p className="text-sm text-gray-400 mt-1">Klik &ldquo;Buat Event&rdquo; untuk menambah event baru.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(evt => (
                <div
                  key={evt.id}
                  className="bg-white border border-gray-100 rounded-2xl p-5 flex items-start gap-4 hover:border-gray-200 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <CalendarDays size={18} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{evt.name}</p>
                    {evt.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{evt.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">{fmtDate(evt.created_at)}</p>
                  </div>
                  <button
                    onClick={() => setDeleteEventTarget(evt)}
                    className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Delete event confirm dialog ── */}
      {deleteEventTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">Hapus Event?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Event <span className="font-medium text-gray-800">&ldquo;{deleteEventTarget.name}&rdquo;</span> akan dihapus permanen.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteEventTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deletingEvent}
                className="flex-1 py-2.5 text-sm font-semibold bg-rose-500 text-white rounded-xl hover:bg-rose-600 disabled:opacity-60 transition-colors"
              >
                {deletingEvent ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
