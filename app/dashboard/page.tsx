'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, Artwork } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import {
  Edit2, Award, CheckSquare, Square, Heart,
  Plus, ChevronDown, ChevronUp, ArrowLeft, Trash2, UserPlus, CheckCircle,
} from 'lucide-react'
import UploadArtworkModal from '@/components/UploadArtworkModal'
import toast from 'react-hot-toast'

const PILL_BG = 'bg-brand-500'

// ── Teacher demo data ─────────────────────────────────────────────────────────
interface Assignment { id: string; title: string; category: string; deadline: string; submitted: number; total: number }
interface GradeItem { id: string; title: string; creator: string; category: string; image_url?: string; submittedAt: string }
interface DemoEvent { id: string; title: string; date: string; description: string; expanded?: boolean }

const DEMO_ASSIGNMENTS: Assignment[] = [
  { id: '1', title: 'Bullying poster', category: 'Visual', deadline: '15-04-2026', submitted: 12, total: 30 },
  { id: '2', title: 'Food Advertisement', category: 'Video', deadline: '25-04-2026', submitted: 5, total: 30 },
  { id: '3', title: 'UI/UX Design', category: 'Web design', deadline: '02-05-2026', submitted: 1, total: 30 },
  { id: '4', title: 'Walking Animation', category: 'Animation', deadline: '20-05-2026', submitted: 0, total: 30 },
]
const DEMO_GRADES: GradeItem[] = [
  { id: '1', title: 'Bird logo', creator: 'Ratu Amelia', category: 'Logo', image_url: 'https://picsum.photos/seed/g1/80/80', submittedAt: '02-01-2026' },
  { id: '2', title: 'Poster bullying', creator: 'Radiska Rizki', category: 'Poster', image_url: 'https://picsum.photos/seed/g2/80/80', submittedAt: '02-01-2026' },
  { id: '3', title: 'Walking Animation', creator: 'Martin', category: 'Animation', image_url: 'https://picsum.photos/seed/g3/80/80', submittedAt: '02-01-2026' },
  { id: '4', title: 'UI/UX Design', creator: 'Lisa', category: 'Web Design', image_url: 'https://picsum.photos/seed/g4/80/80', submittedAt: '02-01-2026' },
  { id: '5', title: 'Poster bullying', creator: 'Naura Yumna', category: 'Poster', image_url: 'https://picsum.photos/seed/g5/80/80', submittedAt: '02-01-2026' },
  { id: '6', title: 'Walking Animation', creator: 'Irene', category: 'Animation', image_url: 'https://picsum.photos/seed/g6/80/80', submittedAt: '02-01-2026' },
  { id: '7', title: 'Poster bullying', creator: 'Ratu Amelia', category: 'Poster', image_url: 'https://picsum.photos/seed/g7/80/80', submittedAt: '02-01-2026' },
]
const DEMO_FEEDBACK_A: GradeItem[] = [
  { id: 'f1', title: 'Tree Painting', creator: 'Kai', category: 'Painting', image_url: 'https://picsum.photos/seed/f1/80/80', submittedAt: '' },
  { id: 'f2', title: 'Poster Jauhi Rokok', creator: 'Karina', category: 'Poster', image_url: 'https://picsum.photos/seed/f2/80/80', submittedAt: '' },
  { id: 'f3', title: 'Abstract', creator: 'Karina', category: 'Painting', image_url: 'https://picsum.photos/seed/f3/80/80', submittedAt: '' },
]
const DEMO_FEEDBACK_B: GradeItem[] = [
  { id: 'f4', title: 'Dolphin Mosaic', creator: 'Naura Yumna', category: 'Mosaic', image_url: 'https://picsum.photos/seed/f4/80/80', submittedAt: '' },
]
const HAVENT_SUBMITTED = [
  { name: 'Kai', class: 'Class A', task: 'Independence day Poster', hoursOverdue: 1 },
  { name: 'Lisa', class: 'Class B', task: 'Independence day Poster', hoursOverdue: 2 },
]
const STUDENT_GROWTH = [
  { name: 'Martin', class: 'Class A', improvement: 80 },
  { name: 'Karina', class: 'Class A', improvement: 50 },
  { name: 'James', class: 'Class B', improvement: 25 },
  { name: 'Irene', class: 'Class B', improvement: 15 },
]
const CLASS_STATS = [
  { label: '5', value: 1 }, { label: '6', value: 4 }, { label: '7', value: 5 },
  { label: '8', value: 6 }, { label: '9', value: 3 }, { label: '10', value: 4 },
]
const DEMO_EVENTS: DemoEvent[] = [
  { id: '1', title: 'School Exhibition', date: '25-06-2026', description: 'Held to commemorate blablabla.', expanded: false },
  { id: '2', title: 'School Portfolio', date: 'indefinitely', description: '', expanded: false },
]
const CURATE_A: GradeItem[] = [
  { id: 'ca1', title: 'Bird logo', creator: 'Ratu Amelia', category: 'Logo', image_url: 'https://picsum.photos/seed/ca1/80/80', submittedAt: '' },
  { id: 'ca2', title: 'Poster bullying', creator: 'Radiska Rizki', category: 'Poster', image_url: 'https://picsum.photos/seed/ca2/80/80', submittedAt: '' },
  { id: 'ca3', title: 'Walking Animation', creator: 'Martin', category: 'Animation', image_url: 'https://picsum.photos/seed/ca3/80/80', submittedAt: '' },
]
const CURATE_B: GradeItem[] = [
  { id: 'cb1', title: 'Poster bullying', creator: 'Naura Yumna', category: 'Poster', image_url: 'https://picsum.photos/seed/cb1/80/80', submittedAt: '' },
]

// ── Student demo data ─────────────────────────────────────────────────────────
const DEMO_ARTWORKS: Artwork[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  title: ['Abstract', 'Leviosa', 'Poster', 'Poster', 'Abstract II', 'Leviosa II', 'Poster III', 'Poster IV'][i],
  category: ['Painting', 'Illustration', 'Poster', 'Poster', 'Painting', 'Illustration', 'Poster', 'Poster'][i],
  status: i < 4 ? 'published' : 'in_progress',
  image_url: `https://picsum.photos/seed/kd${i + 1}/400/400`,
  likes: [31, 90, 55, 28, 14, 22, 37, 19][i],
  creator_id: '',
  profiles: { id: '', username: 'karina', first_name: 'Karina', last_name: '', email: '', role: 'student', created_at: '' },
  created_at: '',
  updated_at: '',
}))
const DEMO_BADGES = [
  { id: '1', name: 'Best Mosaic In Class', earned_at: '2020-12-14' },
  { id: '2', name: 'Top weekly poster designer', earned_at: '2020-12-14' },
]
const DEMO_TASKS = [
  { id: '1', title: 'Bullying poster', deadline: '18-05-2026', status: 'Visual', done: true },
  { id: '2', title: 'Food Advertisement', deadline: '28-05-2026', status: 'Video', done: false },
]

// ── SVG bar chart ─────────────────────────────────────────────────────────────
function SimpleBarChart({ data }: { data: { label: string; value: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.value))
  const chartH = 140; const barW = 36; const gap = 18; const padLeft = 36

  return (
    <svg viewBox={`0 0 ${padLeft + data.length * (barW + gap) - gap + 10} ${chartH + 50}`} className="w-full max-w-md">
      {[0, 2, 4, 6].map(val => {
        const y = chartH - (val / (maxVal || 1)) * chartH
        return (
          <g key={val}>
            <text x={padLeft - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#999">{val}</text>
            <line x1={padLeft} y1={y} x2={padLeft + data.length * (barW + gap)} y2={y} stroke="#f0f0f0" strokeWidth="1" />
          </g>
        )
      })}
      {data.map((d, i) => {
        const barH = (d.value / (maxVal || 1)) * chartH
        const x = padLeft + i * (barW + gap)
        const y = chartH - barH
        return (
          <g key={d.label}>
            <motion.rect x={x} y={y} width={barW} height={barH} fill="#C87533" rx="3"
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
              style={{ transformOrigin: `${x + barW / 2}px ${chartH}px` }}
              transition={{ delay: i * 0.08, duration: 0.5 }} />
            <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize="10" fill="#666">{d.label}</text>
          </g>
        )
      })}
      <line x1={padLeft} y1={0} x2={padLeft} y2={chartH} stroke="#ccc" strokeWidth="1" />
      <line x1={padLeft} y1={chartH} x2={padLeft + data.length * (barW + gap)} y2={chartH} stroke="#ccc" strokeWidth="1" />
      <text x={padLeft + (data.length * (barW + gap)) / 2} y={chartH + 34} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#444">Nilai</text>
    </svg>
  )
}

// ── Profile avatar SVG ────────────────────────────────────────────────────────
function AvatarPlaceholder() {
  return (
    <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
      <circle cx="40" cy="30" r="16" fill="#9CA3AF" />
      <ellipse cx="40" cy="64" rx="24" ry="16" fill="#9CA3AF" />
    </svg>
  )
}

// ── Main dashboard inner (uses useSearchParams) ───────────────────────────────
function DashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading, refreshProfile } = useAuth()

  const isTeacher = profile?.role === 'teacher'
  const teacherTabs = ['assignments', 'grade', 'feedback', 'monitoring', 'curation', 'addstudents', 'editprofile']
  const studentTabs = ['assignment', 'showcase', 'progress', 'badges', 'myprofile']
  const validTabs = isTeacher ? teacherTabs : studentTabs
  const defaultTab = isTeacher ? 'assignments' : 'assignment'

  const tabParam = searchParams.get('tab') || ''
  const activeTab = validTabs.includes(tabParam) ? tabParam : defaultTab

  function goTab(tab: string) {
    router.push(`/dashboard?tab=${tab}`)
  }

  // ── Teacher state ──
  const [assignments] = useState<Assignment[]>(DEMO_ASSIGNMENTS)
  const [events, setEvents] = useState<DemoEvent[]>(DEMO_EVENTS)
  const [addAssignmentOpen, setAddAssignmentOpen] = useState(false)
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [newAssignment, setNewAssignment] = useState({ title: '', category: '', deadline: '', description: '' })
  const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '' })
  const [growthDetail, setGrowthDetail] = useState<typeof STUDENT_GROWTH[0] | null>(null)
  const [curateView, setCurateView] = useState<'events' | 'curate' | 'curated'>('events')
  const [curateEventTitle, setCurateEventTitle] = useState('')

  // ── Add Students state ──
  const [studentForm, setStudentForm] = useState({ first_name: '', last_name: '', username: '', nisn: '', grade: '', className: '' })
  const [addingStudent, setAddingStudent] = useState(false)
  const [addedStudents, setAddedStudents] = useState<Array<typeof studentForm & { id?: string }>>([])
  const [justAdded, setJustAdded] = useState<typeof studentForm | null>(null)

  // ── Edit Profile state (shared) ──
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', username: '', bio: '', grade: '', className: '', department: '', subject: '', nisn: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)

  // ── Student state ──
  const [artworks, setArtworks] = useState<Artwork[]>(DEMO_ARTWORKS)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [artLoading, setArtLoading] = useState(true)
  const [feedbackList, setFeedbackList] = useState<Array<{ id: string; content: string; artwork_title: string; teacher_name: string; created_at: string }>>([])
  const [editingProfile, setEditingProfile] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    if (!validTabs.includes(tabParam)) {
      router.replace(`/dashboard?tab=${defaultTab}`)
    }
  }, [user, profile, loading, tabParam])

  // Load artworks for student
  useEffect(() => {
    if (!user || isTeacher) return
    supabase.from('artworks').select('*, profiles(*)')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) setArtworks(data as Artwork[])
        setArtLoading(false)
      }, () => setArtLoading(false))

    // Load feedback (teacher comments on student's artworks)
    supabase
      .from('comments')
      .select('id, content, created_at, artworks(title), profiles(first_name, last_name, role)')
      .eq('artworks.creator_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          const filtered = (data as any[])
            .filter((c: any) => c.profiles?.role === 'teacher')
            .map((c: any) => ({
              id: c.id,
              content: c.content,
              artwork_title: c.artworks?.title || '',
              teacher_name: c.profiles ? `${c.profiles.first_name} ${c.profiles.last_name}`.trim() : 'Teacher',
              created_at: c.created_at,
            }))
          setFeedbackList(filtered)
        }
      }, () => {})
  }, [user, isTeacher])

  // Pre-fill edit profile form when tab is active
  useEffect(() => {
    if ((activeTab === 'editprofile' || activeTab === 'myprofile') && profile && !profileLoaded) {
      setEditForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        grade: profile.grade || '',
        className: profile.class || '',
        department: profile.department || '',
        subject: profile.subject_specialization || '',
        nisn: profile.nisn || '',
      })
      setProfileLoaded(true)
    }
  }, [activeTab, profile, profileLoaded])

  const published = artworks.filter(a => a.status === 'published')
  const inProgress = artworks.filter(a => a.status === 'in_progress' || a.status === 'pending')

  function toggleEvent(id: string) {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e))
  }

  async function handleAddAssignment() {
    if (!newAssignment.title) { toast.error('Title required'); return }
    await supabase.from('assignments').insert({ ...newAssignment, teacher_id: user?.id })
    toast.success('Assignment created!')
    setAddAssignmentOpen(false)
    setNewAssignment({ title: '', category: '', deadline: '', description: '' })
  }

  async function handleAddEvent() {
    if (!newEvent.title) { toast.error('Title required'); return }
    await supabase.from('events').insert({ ...newEvent, teacher_id: user?.id })
    toast.success('Event created!')
    setAddEventOpen(false)
    setNewEvent({ title: '', date: '', description: '' })
  }

  async function handleAddStudent() {
    if (!studentForm.username || !studentForm.nisn || !studentForm.first_name) {
      toast.error('First name, username and NISN are required')
      return
    }
    setAddingStudent(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/add-student`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            first_name: studentForm.first_name,
            last_name: studentForm.last_name,
            username: studentForm.username,
            nisn: studentForm.nisn,
            grade: studentForm.grade,
            class: studentForm.className,
            teacher_id: user?.id,
          }),
        }
      )
      const result = await res.json()
      if (result.error) {
        toast.error(result.error)
      } else {
        setJustAdded({ ...studentForm })
        setAddedStudents(prev => [{ ...studentForm, id: result.userId }, ...prev])
        setStudentForm({ first_name: '', last_name: '', username: '', nisn: '', grade: '', className: '' })
        toast.success(`Student ${studentForm.first_name} added!`)
      }
    } catch {
      toast.error('Failed to add student')
    }
    setAddingStudent(false)
  }

  async function handleSaveProfile() {
    if (!user) return
    setSavingProfile(true)
    const updateData: Record<string, string> = {
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      username: editForm.username,
      bio: editForm.bio,
      grade: editForm.grade,
      class: editForm.className,
    }
    if (isTeacher) {
      updateData.department = editForm.department
      updateData.subject_specialization = editForm.subject
    } else {
      updateData.nisn = editForm.nisn
    }
    const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id)
    setSavingProfile(false)
    if (error) { toast.error(error.message); return }
    await refreshProfile()
    setProfileLoaded(false)
    toast.success('Profile saved!')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-100 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  const tabLabels: Record<string, string> = {
    assignments: 'Assignments', grade: 'Grade', feedback: 'Feedback',
    monitoring: 'Monitoring', curation: 'Curation', addstudents: 'Add Students',
    editprofile: 'Edit Profile',
    assignment: 'Assignment', showcase: 'Showcase', progress: 'Progress', badges: 'Badges',
    myprofile: 'My Profile',
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ─── Profile Banner ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full py-10 px-4 text-center"
        style={{ background: 'linear-gradient(to bottom, #FBBFC4, #FDD5D9)' }}
      >
        <div className="w-20 h-20 rounded-full bg-gray-300 mx-auto overflow-hidden flex items-center justify-center shadow-md">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            : <AvatarPlaceholder />
          }
        </div>

        <div className={`inline-block mt-3 ${PILL_BG} text-white px-6 py-1.5 rounded-full`}>
          <span className="text-sm font-bold tracking-widest uppercase">
            {profile?.first_name || (isTeacher ? 'Teacher' : 'Student')}
          </span>
        </div>

        <p className="mt-2 font-bold text-gray-800 text-base">
          {profile?.grade || (isTeacher ? 'DKV Teacher' : 'Grade XI DKV 1')} – {profile?.class || 'SMK DBB'}
        </p>
        <p className="text-gray-600 text-sm mt-0.5">
          {profile?.subject_specialization || 'Specializes in Illustrations and Poster designs'}
        </p>
      </motion.div>

      {/* ─── Tab Navigation ─── */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto flex overflow-x-auto scrollbar-none">
          {validTabs.map(tab => (
            <button
              key={tab}
              onClick={() => {
                goTab(tab)
                if (tab !== 'monitoring') setGrowthDetail(null)
                if (tab !== 'curation') setCurateView('events')
              }}
              className={`flex-1 min-w-[80px] py-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content Area ─── */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">

          {/* ════════════════ TEACHER TABS ════════════════ */}

          {/* ASSIGNMENTS */}
          {isTeacher && activeTab === 'assignments' && (
            <motion.div key="assignments" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="space-y-4">
                {assignments.map(a => (
                  <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg truncate">{a.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-sm font-semibold text-gray-500">Deadline {a.deadline}</span>
                        <span className="text-sm font-semibold text-gray-700">{a.category}</span>
                      </div>
                    </div>
                    <div className="bg-rose-300 text-white px-5 py-3 rounded-xl text-sm font-bold text-center leading-tight shrink-0 min-w-[72px]">
                      {a.submitted}/{a.total}<br />
                      <span className="text-xs font-medium">submitted</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setAddAssignmentOpen(true)}
                  className={`${PILL_BG} text-white font-bold text-sm px-8 py-3 rounded-lg uppercase tracking-wide hover:opacity-90 transition-opacity`}
                >
                  Upload Assignment
                </button>
              </div>
            </motion.div>
          )}

          {/* GRADE */}
          {isTeacher && activeTab === 'grade' && (
            <motion.div key="grade" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="space-y-3">
                {DEMO_GRADES.map(g => (
                  <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {g.image_url && <img src={g.image_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{g.title}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                        <span className="text-sm text-gray-500">by {g.creator}</span>
                        <span className="text-sm font-semibold text-gray-700">{g.category}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Submitted at {g.submittedAt}</p>
                    </div>
                    <button className="bg-rose-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold shrink-0 hover:bg-rose-400 transition-colors">
                      Grade
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 justify-center mt-8">
                {[1, 2, 3].map(p => (
                  <button key={p} className={`w-9 h-9 rounded-full text-sm font-semibold transition-colors ${p === 1 ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'}`}>{p}</button>
                ))}
                <button className="px-4 h-9 rounded-full text-sm font-semibold bg-brand-50 text-brand-600 hover:bg-brand-100">Next</button>
              </div>
            </motion.div>
          )}

          {/* FEEDBACK */}
          {isTeacher && activeTab === 'feedback' && (
            <motion.div key="feedback" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {[{ label: 'Class A', items: DEMO_FEEDBACK_A }, { label: 'Class B', items: DEMO_FEEDBACK_B }].map(cls => (
                <div key={cls.label} className="mb-6">
                  <div className={`inline-block ${PILL_BG} text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4`}>
                    {cls.label}
                  </div>
                  <div className="space-y-3">
                    {cls.items.map(g => (
                      <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          {g.image_url && <img src={g.image_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900">{g.title}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-sm text-gray-500">by {g.creator}</span>
                            <span className="text-sm text-amber-600 font-medium">In progress</span>
                          </div>
                        </div>
                        <button className="bg-rose-200 text-rose-700 px-4 py-2 rounded-xl text-sm font-semibold shrink-0 hover:bg-rose-300 transition-colors whitespace-nowrap">
                          Add comment
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* MONITORING */}
          {isTeacher && activeTab === 'monitoring' && (
            <motion.div key="monitoring" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <AnimatePresence mode="wait">
                {growthDetail ? (
                  <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="w-full rounded-xl py-6 px-4 mb-6 text-center" style={{ background: 'linear-gradient(to bottom, #FBBFC4, #FDD5D9)' }}>
                      <h2 className="font-display text-2xl font-bold text-gray-800">Student growth</h2>
                      <p className="text-gray-500 text-sm mt-1">Details</p>
                    </div>
                    <button onClick={() => setGrowthDetail(null)} className="w-10 h-10 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-500 flex items-center justify-center transition-colors mb-6">
                      <ArrowLeft size={18} />
                    </button>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900 text-lg">{growthDetail.name}</span>
                        <span className="text-sm text-gray-500">{growthDetail.class}</span>
                      </div>
                      <span className="font-bold text-gray-900">{growthDetail.improvement}% Improvement</span>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                      <svg viewBox="0 0 400 260" className="w-full max-w-md mx-auto">
                        {[0, 100, 200, 500, 600].map(val => {
                          const y = 220 - (val / 600) * 180
                          return (
                            <g key={val}>
                              <text x="30" y={y + 4} textAnchor="end" fontSize="10" fill="#999">{val}</text>
                              <line x1="35" y1={y} x2="380" y2={y} stroke="#f0f0f0" strokeWidth="1" />
                            </g>
                          )
                        })}
                        <motion.rect x="100" y={220 - (400 / 600) * 180} width="70" height={(400 / 600) * 180} fill="#FDDBC2" stroke="#333" strokeWidth="1"
                          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ transformOrigin: '135px 220px' }} transition={{ duration: 0.6 }} />
                        <motion.rect x="200" y={220 - ((400 + growthDetail.improvement * 5) / 600) * 180} width="70"
                          height={((400 + growthDetail.improvement * 5) / 600) * 180}
                          fill="#86EFAC" stroke="#333" strokeWidth="1"
                          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ transformOrigin: '235px 220px' }} transition={{ duration: 0.6, delay: 0.15 }} />
                        <text x="135" y="235" textAnchor="middle" fontSize="9" fill="#666">Prior</text>
                        <text x="135" y="245" textAnchor="middle" fontSize="9" fill="#666">Performance</text>
                        <text x="235" y="235" textAnchor="middle" fontSize="9" fill="#666">Current</text>
                        <text x="235" y="245" textAnchor="middle" fontSize="9" fill="#666">Performance</text>
                        <line x1="35" y1="40" x2="35" y2="220" stroke="#ccc" strokeWidth="1" />
                        <line x1="35" y1="220" x2="380" y2="220" stroke="#ccc" strokeWidth="1" />
                        <text x="210" y="260" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#444">Student Growth Targets</text>
                        <text x="310" y="100" fontSize="8" fill="#e11d48">Target</text>
                        <text x="310" y="110" fontSize="8" fill="#e11d48">Growth to</text>
                        <text x="310" y="120" fontSize="8" fill="#e11d48">Proficiency</text>
                        <path d="M305 88 L302 88 L302 155 L305 155" stroke="#e11d48" fill="none" strokeWidth="1.5" />
                      </svg>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className={`inline-block ${PILL_BG} text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4`}>
                      Haven&apos;t Submitted
                    </div>
                    <div className="space-y-3 mb-10">
                      {HAVENT_SUBMITTED.map((s, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4 shadow-sm">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{s.name}</span>
                              <span className="text-sm text-gray-400">{s.class}</span>
                            </div>
                            <p className="font-semibold text-gray-700 mt-0.5">{s.task}</p>
                          </div>
                          <span className="bg-rose-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shrink-0">
                            Overdue by {s.hoursOverdue} hour
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className={`inline-block ${PILL_BG} text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4`}>
                      Student Growth
                    </div>
                    <div className="space-y-3 mb-10">
                      {STUDENT_GROWTH.map((s, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4 shadow-sm">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{s.name}</span>
                              <span className="text-sm text-gray-400">{s.class}</span>
                            </div>
                            <p className="font-bold text-gray-800 mt-0.5">{s.improvement}% Improvement</p>
                          </div>
                          <button onClick={() => setGrowthDetail(s)} className="bg-rose-200 text-rose-700 px-5 py-2 rounded-xl text-sm font-semibold shrink-0 hover:bg-rose-300 transition-colors">
                            Details
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className={`inline-block ${PILL_BG} text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4`}>
                      Class Statistics
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                      <p className="font-bold text-gray-800 mb-1">Class A:</p>
                      <p className="text-xs text-gray-400 mb-4">Frekuensi →</p>
                      <SimpleBarChart data={CLASS_STATS} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* CURATION */}
          {isTeacher && activeTab === 'curation' && (
            <motion.div key="curation" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <AnimatePresence mode="wait">
                {curateView === 'events' && (
                  <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className={`inline-block ${PILL_BG} text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6`}>
                      Pick Artworks For:
                    </div>
                    <div className="space-y-3 mb-8">
                      {events.map(ev => (
                        <div key={ev.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                          <div className="p-4 flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-lg">{ev.title}</span>
                                <span className="text-sm text-gray-400">{ev.date}</span>
                              </div>
                              {ev.description && <p className="text-sm text-gray-500 mt-1">{ev.description}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => { setCurateEventTitle(ev.title); setCurateView('curate') }}
                                className="bg-rose-200 text-rose-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-rose-300 transition-colors">
                                Curate
                              </button>
                              <button onClick={() => { setCurateEventTitle(ev.title); setCurateView('curated') }}
                                className="text-gray-400 hover:text-gray-600 px-2 py-2 text-sm font-semibold">
                                View
                              </button>
                              <button onClick={() => toggleEvent(ev.id)} className="text-gray-400 hover:text-gray-600">
                                {ev.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button onClick={() => setAddEventOpen(true)} className={`${PILL_BG} text-white font-bold text-sm px-8 py-3 rounded-lg uppercase tracking-wide hover:opacity-90 transition-opacity`}>
                        Add Event
                      </button>
                    </div>
                  </motion.div>
                )}

                {curateView === 'curate' && (
                  <motion.div key="curate" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <button onClick={() => setCurateView('events')} className="w-10 h-10 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-500 flex items-center justify-center transition-colors mb-6">
                      <ArrowLeft size={18} />
                    </button>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">{curateEventTitle}</h3>
                    {[{ label: 'Class A', items: CURATE_A }, { label: 'Class B', items: CURATE_B }].map(cls => (
                      <div key={cls.label} className="mb-8">
                        <div className={`inline-block ${PILL_BG} text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4`}>
                          {cls.label}
                        </div>
                        <div className="space-y-3">
                          {cls.items.map(g => (
                            <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm">
                              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                {g.image_url && <img src={g.image_url} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900">{g.title}</p>
                                <span className="text-sm text-gray-500">by {g.creator}</span>
                              </div>
                              <button className={`${PILL_BG} text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity`}>
                                Pick
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {curateView === 'curated' && (
                  <motion.div key="curated" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <button onClick={() => setCurateView('events')} className="w-10 h-10 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-500 flex items-center justify-center transition-colors mb-6">
                      <ArrowLeft size={18} />
                    </button>
                    <h3 className="font-bold text-gray-900 text-lg mb-6">{curateEventTitle} — Curated Works</h3>
                    {[{ label: 'Class A', items: CURATE_A }, { label: 'Class B', items: CURATE_B }].map(cls => (
                      <div key={cls.label} className="mb-8">
                        <div className={`inline-block ${PILL_BG} text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4`}>
                          {cls.label}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {cls.items.map(g => (
                            <div key={g.id} className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                              {g.image_url && <img src={g.image_url} alt="" className="w-full aspect-square object-cover" />}
                              <div className="p-2">
                                <p className="text-xs font-bold text-gray-800 truncate">{g.title}</p>
                                <p className="text-[11px] text-gray-400 truncate">{g.creator}</p>
                              </div>
                              <button className="w-full text-rose-500 hover:bg-rose-50 text-xs font-semibold py-2 border-t border-gray-100 flex items-center justify-center gap-1 transition-colors">
                                <Trash2 size={11} /> Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ADD STUDENTS */}
          {isTeacher && activeTab === 'addstudents' && (
            <motion.div key="addstudents" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>

              {/* Success card */}
              <AnimatePresence>
                {justAdded && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6 flex items-start gap-4"
                  >
                    <CheckCircle size={22} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-800">Student added successfully!</p>
                      <p className="text-sm text-emerald-600 mt-0.5">
                        <strong>{justAdded.first_name} {justAdded.last_name}</strong> — username:{' '}
                        <span className="font-mono font-bold">{justAdded.username}</span>, NISN:{' '}
                        <span className="font-mono font-bold">{justAdded.nisn}</span>
                      </p>
                      <p className="text-xs text-emerald-500 mt-1">Student&apos;s default password is their NISN.</p>
                    </div>
                    <button onClick={() => setJustAdded(null)} className="ml-auto text-emerald-400 hover:text-emerald-600 text-lg font-bold">×</button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add student form */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
                <div className="flex items-center gap-2 mb-5">
                  <UserPlus size={18} className="text-rose-500" />
                  <h3 className="font-bold text-gray-900">Add New Student</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">First Name <span className="text-rose-500">*</span></label>
                    <input className="kreora-input" placeholder="First name" value={studentForm.first_name}
                      onChange={e => setStudentForm(f => ({ ...f, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label>
                    <input className="kreora-input" placeholder="Last name" value={studentForm.last_name}
                      onChange={e => setStudentForm(f => ({ ...f, last_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Username <span className="text-rose-500">*</span></label>
                    <input className="kreora-input" placeholder="e.g. radika_rizki" value={studentForm.username}
                      onChange={e => setStudentForm(f => ({ ...f, username: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">NISN <span className="text-rose-500">*</span></label>
                    <input className="kreora-input font-mono" placeholder="10-digit NISN" value={studentForm.nisn}
                      onChange={e => setStudentForm(f => ({ ...f, nisn: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Grade</label>
                    <input className="kreora-input" placeholder="e.g. XI" value={studentForm.grade}
                      onChange={e => setStudentForm(f => ({ ...f, grade: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Class</label>
                    <input className="kreora-input" placeholder="e.g. DKV 1" value={studentForm.className}
                      onChange={e => setStudentForm(f => ({ ...f, className: e.target.value }))} />
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-3">Student&apos;s initial password will be set to their NISN.</p>

                <div className="flex justify-end mt-5">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAddStudent}
                    disabled={addingStudent}
                    className={`${PILL_BG} text-white font-bold text-sm px-8 py-3 rounded-lg uppercase tracking-wide hover:opacity-90 transition-opacity disabled:opacity-60`}
                  >
                    {addingStudent ? 'Adding...' : 'Add Student'}
                  </motion.button>
                </div>
              </div>

              {/* Student list */}
              {addedStudents.length > 0 && (
                <div>
                  <div className={`inline-block ${PILL_BG} text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4`}>
                    Added This Session
                  </div>
                  <div className="space-y-3">
                    {addedStudents.map((s, i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm">
                            {s.first_name[0]?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-gray-400">@{s.username} · NISN: {s.nisn}</p>
                          </div>
                        </div>
                        {s.grade && (
                          <span className="text-xs text-gray-500 shrink-0">{s.grade} {s.className}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ════════════════ STUDENT TABS ════════════════ */}

          {/* ASSIGNMENT (student) */}
          {!isTeacher && activeTab === 'assignment' && (
            <motion.div key="assignment" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {artLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => <div key={i} className="skeleton rounded-xl aspect-square" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {artworks.map((art, i) => (
                    <motion.div key={art.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                      <Link href={`/gallery/${art.id}`} className="block group">
                        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="relative aspect-square">
                            <img src={art.image_url || ''} alt={art.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            {i === 0 && (
                              <div className="absolute top-2 left-2 w-7 h-7 bg-brand-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow">1</div>
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className="font-bold text-sm text-gray-800 truncate">{art.title}</p>
                            <p className="text-xs text-gray-400">by {art.profiles?.first_name || 'Unknown'}</p>
                            <div className="flex items-center justify-between mt-1.5">
                              <div className="flex items-center gap-1 text-rose-300">
                                <Heart size={11} fill="currentColor" />
                                <span className="text-xs text-gray-400">{art.likes}</span>
                              </div>
                              <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-semibold">Feedback</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
              <div className="flex justify-end mt-8">
                <button onClick={() => setUploadOpen(true)} className={`${PILL_BG} text-white font-bold text-sm px-8 py-3 rounded-lg uppercase tracking-wide hover:opacity-90 transition-opacity`}>
                  Upload Artwork
                </button>
              </div>
            </motion.div>
          )}

          {/* SHOWCASE */}
          {!isTeacher && activeTab === 'showcase' && (
            <motion.div key="showcase" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
              {published.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Heart size={28} className="text-gray-300" />
                  </div>
                  <p>No published artworks yet</p>
                </div>
              )}
              {published.map(art => (
                <Link key={art.id} href={`/gallery/${art.id}`}>
                  <div className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100 hover:border-rose-200 transition-colors">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-rose-50 shrink-0">
                      {art.image_url && <img src={art.image_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{art.title}</p>
                      <p className="text-xs text-gray-400">{art.category}</p>
                    </div>
                    <div className="flex items-center gap-1 text-rose-400 shrink-0">
                      <Heart size={13} fill="currentColor" />
                      <span className="text-xs text-gray-500">{art.likes}</span>
                    </div>
                    <span className="text-xs bg-rose-100 text-rose-600 px-3 py-1 rounded-lg shrink-0 font-medium">View</span>
                  </div>
                </Link>
              ))}
            </motion.div>
          )}

          {/* PROGRESS */}
          {!isTeacher && activeTab === 'progress' && (
            <motion.div key="progress" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-8">
              <div>
                <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Number of Works</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-sm text-gray-500 mb-2">Published</p>
                    <p className="font-display text-3xl font-bold text-brand-500">{published.length}</p>
                    <div className="mt-2 h-2 bg-brand-100 rounded-full">
                      <div className="h-2 bg-brand-500 rounded-full" style={{ width: `${artworks.length ? (published.length / artworks.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-sm text-gray-500 mb-2">In Progress</p>
                    <p className="font-display text-3xl font-bold text-amber-500">{inProgress.length}</p>
                    <div className="mt-2 h-2 bg-amber-100 rounded-full">
                      <div className="h-2 bg-amber-400 rounded-full" style={{ width: `${artworks.length ? (inProgress.length / artworks.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Task Checklist</h3>
                <div className="space-y-2">
                  {DEMO_TASKS.map(t => (
                    <div key={t.id} className="bg-white rounded-xl p-3.5 flex items-center gap-3 border border-gray-100">
                      {t.done ? <CheckSquare size={18} className="text-brand-500 shrink-0" /> : <Square size={18} className="text-gray-300 shrink-0" />}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">{t.title}</p>
                        <p className="text-xs text-gray-400">Deadline: {t.deadline} · <span className="text-rose-500">{t.status}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Feedback from Teacher</h3>
                {feedbackList.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                    <p className="text-gray-400 text-sm">No feedback yet. Keep creating!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {feedbackList.map(fb => (
                      <div key={fb.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                            <Award size={14} className="text-brand-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-brand-600">{fb.teacher_name}</span>
                              {fb.artwork_title && (
                                <span className="text-xs text-gray-400">on &ldquo;{fb.artwork_title}&rdquo;</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">{fb.content}</p>
                            {fb.created_at && (
                              <p className="text-[11px] text-gray-400 mt-1">
                                {new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* BADGES */}
          {!isTeacher && activeTab === 'badges' && (
            <motion.div key="badges" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="space-y-3">
                {DEMO_BADGES.map(b => (
                  <div key={b.id} className="bg-white rounded-xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm">
                    <div className="w-14 h-14 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
                      <Award size={26} className="text-rose-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">&ldquo;{b.name}&rdquo;</p>
                      <p className="text-xs text-gray-400 mt-0.5">Date achieved: {new Date(b.earned_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {DEMO_BADGES.length === 0 && (
                  <div className="text-center py-16 text-gray-400">
                    <Award size={40} className="mx-auto mb-3 text-rose-200" />
                    <p>No badges yet. Keep creating!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ════════════════ TEACHER: EDIT PROFILE ════════════════ */}
          {isTeacher && activeTab === 'editprofile' && (
            <motion.div key="editprofile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Edit2 size={18} className="text-brand-500" />
                  <h3 className="font-bold text-gray-900">Edit Profile</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">First Name</label>
                    <input className="kreora-input" value={editForm.first_name}
                      onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label>
                    <input className="kreora-input" value={editForm.last_name}
                      onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Username</label>
                    <input className="kreora-input" value={editForm.username}
                      onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Grade</label>
                    <input className="kreora-input" placeholder="e.g. X, XI, XII"
                      value={editForm.grade} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Class</label>
                    <input className="kreora-input" placeholder="e.g. DKV 1"
                      value={editForm.className} onChange={e => setEditForm(f => ({ ...f, className: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Department</label>
                    <input className="kreora-input" value={editForm.department}
                      onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Subject / Specialization</label>
                    <input className="kreora-input" value={editForm.subject}
                      onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Bio</label>
                    <textarea className="kreora-input resize-none" rows={3} placeholder="Tell something about yourself..."
                      value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary disabled:opacity-60">
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════════════ STUDENT: MY PROFILE ════════════════ */}
          {!isTeacher && activeTab === 'myprofile' && (
            <motion.div key="myprofile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <AnimatePresence mode="wait">
                {!editingProfile ? (
                  <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {/* Profile Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
                      <div className="h-20 w-full" style={{ background: 'linear-gradient(to bottom, #FBBFC4, #FDD5D9)' }} />
                      <div className="px-6 pb-6">
                        <div className="flex items-end justify-between -mt-10 mb-4">
                          <div className="w-20 h-20 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center text-2xl font-bold text-white shadow-md overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}>
                            {(profile?.first_name?.[0] || 'S').toUpperCase()}
                          </div>
                          <button
                            onClick={() => setEditingProfile(true)}
                            className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 border border-brand-200 bg-brand-50 px-4 py-2 rounded-lg hover:bg-brand-100 transition-colors"
                          >
                            <Edit2 size={13} /> Edit Profile
                          </button>
                        </div>
                        <h2 className="font-display text-xl font-bold text-gray-900">
                          {profile?.first_name} {profile?.last_name}
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">@{profile?.username || '—'}</p>
                        {profile?.bio && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{profile.bio}</p>}
                      </div>
                    </div>

                    {/* Detail rows */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                      {[
                        { label: 'Grade', value: profile?.grade },
                        { label: 'Class', value: profile?.class },
                        { label: 'NISN', value: profile?.nisn, mono: true },
                        { label: 'Email', value: profile?.email },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between px-6 py-3.5">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-24">{row.label}</span>
                          <span className={`text-sm text-gray-800 font-medium flex-1 text-right ${row.mono ? 'font-mono' : ''}`}>
                            {row.value || <span className="text-gray-300">—</span>}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                        <p className="font-display text-2xl font-bold text-brand-500">{artworks.length}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Artworks</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                        <p className="font-display text-2xl font-bold text-brand-500">{published.length}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Published</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                        <p className="font-display text-2xl font-bold text-rose-400">{artworks.reduce((s, a) => s + (a.likes || 0), 0)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Likes</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="edit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <button onClick={() => setEditingProfile(false)} className="text-gray-400 hover:text-gray-600 mr-1">
                          <ArrowLeft size={16} />
                        </button>
                        <Edit2 size={18} className="text-brand-500" />
                        <h3 className="font-bold text-gray-900">Edit Profile</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">First Name</label>
                          <input className="kreora-input" value={editForm.first_name}
                            onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label>
                          <input className="kreora-input" value={editForm.last_name}
                            onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Username</label>
                          <input className="kreora-input" value={editForm.username}
                            onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">NISN</label>
                          <input className="kreora-input font-mono" value={editForm.nisn}
                            onChange={e => setEditForm(f => ({ ...f, nisn: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Grade</label>
                          <select className="kreora-input" value={editForm.grade} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))}>
                            <option value="">Select grade</option>
                            <option value="X">X</option>
                            <option value="XI">XI</option>
                            <option value="XII">XII</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Class</label>
                          <select className="kreora-input" value={editForm.className} onChange={e => setEditForm(f => ({ ...f, className: e.target.value }))}>
                            <option value="">Select class</option>
                            <option value="DKV 1">DKV 1</option>
                            <option value="DKV 2">DKV 2</option>
                            <option value="DKV 3">DKV 3</option>
                            <option value="MM 1">MM 1</option>
                            <option value="MM 2">MM 2</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Bio</label>
                          <textarea className="kreora-input resize-none" rows={3} placeholder="Tell something about yourself..."
                            value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} />
                        </div>
                      </div>

                      <div className="flex gap-3 justify-end mt-6">
                        <button onClick={() => setEditingProfile(false)} className="btn-outline">Cancel</button>
                        <motion.button whileTap={{ scale: 0.97 }} onClick={async () => { await handleSaveProfile(); setEditingProfile(false) }}
                          disabled={savingProfile} className="btn-primary disabled:opacity-60">
                          {savingProfile ? 'Saving...' : 'Save'}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ─── Student: Upload Artwork Modal ─── */}
      {!isTeacher && (
        <UploadArtworkModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            if (user) {
              supabase.from('artworks').select('*, profiles(*)')
                .eq('creator_id', user.id)
                .order('created_at', { ascending: false })
                .then(({ data }) => { if (data) setArtworks(data as Artwork[]) })
            }
          }}
        />
      )}

      {/* ─── Teacher: Add Assignment Modal ─── */}
      <AnimatePresence>
        {addAssignmentOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2e25]/40 backdrop-blur-sm px-4"
            onClick={() => setAddAssignmentOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #FBBFC4, #FDD5D9)' }}>
                <h3 className="font-bold text-gray-900 text-lg">Add Assignment</h3>
                <button onClick={() => setAddAssignmentOpen(false)} className="text-gray-600 hover:text-gray-900 text-xl font-bold">×</button>
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Title</label>
                  <input className="kreora-input" placeholder="Assignment title" value={newAssignment.title}
                    onChange={e => setNewAssignment(a => ({ ...a, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                    <input className="kreora-input" placeholder="Visual, Video..." value={newAssignment.category}
                      onChange={e => setNewAssignment(a => ({ ...a, category: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Deadline</label>
                    <input className="kreora-input" type="date" value={newAssignment.deadline}
                      onChange={e => setNewAssignment(a => ({ ...a, deadline: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                  <textarea className="kreora-input resize-none" rows={3} placeholder="Optional description"
                    value={newAssignment.description} onChange={e => setNewAssignment(a => ({ ...a, description: e.target.value }))} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setAddAssignmentOpen(false)} className="flex-1 btn-outline">Cancel</button>
                  <button onClick={handleAddAssignment} className="flex-1 btn-primary">Create</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Teacher: Add Event Modal ─── */}
      <AnimatePresence>
        {addEventOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2e25]/40 backdrop-blur-sm px-4"
            onClick={() => setAddEventOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #FBBFC4, #FDD5D9)' }}>
                <h3 className="font-bold text-gray-900 text-lg">Add Event</h3>
                <button onClick={() => setAddEventOpen(false)} className="text-gray-600 hover:text-gray-900 text-xl font-bold">×</button>
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Event Name</label>
                  <input className="kreora-input" placeholder="e.g. School Exhibition" value={newEvent.title}
                    onChange={e => setNewEvent(v => ({ ...v, title: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Date</label>
                  <input className="kreora-input" type="date" value={newEvent.date}
                    onChange={e => setNewEvent(v => ({ ...v, date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                  <textarea className="kreora-input resize-none" rows={3}
                    value={newEvent.description} onChange={e => setNewEvent(v => ({ ...v, description: e.target.value }))} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setAddEventOpen(false)} className="flex-1 btn-outline">Cancel</button>
                  <button onClick={handleAddEvent} className="flex-1 btn-primary">Add Event</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Page export with Suspense ─────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-100 border-t-brand-500 rounded-full animate-spin" />
      </div>
    }>
      <DashboardInner />
    </Suspense>
  )
}
