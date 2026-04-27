import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Trophy, Sparkles, Wrench, Lightbulb, Award } from 'lucide-react'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BADGE_META: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  'Karya Terbaik':  { icon: Trophy,    color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100'  },
  'Paling Kreatif': { icon: Sparkles,  color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-100' },
  'Teknik Bagus':   { icon: Wrench,    color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-100'   },
  'Inovatif':       { icon: Lightbulb, color: 'text-orange-500', bg: 'bg-orange-50',  border: 'border-orange-100' },
}

const FALLBACK_META = { icon: Award, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100' }

export default async function StudentBadgesPage() {
  const cookieStore = cookies()
  const raw = cookieStore.get('kreora_student_session')?.value
  if (!raw) redirect('/login')

  const { nisn } = JSON.parse(raw)

  // Get submissions for this student
  const { data: submissions } = await supabaseAdmin
    .from('submissions')
    .select('id, assignment_id, assignments(title)')
    .eq('nisn', nisn)

  const subIds = (submissions ?? []).map(s => s.id)

  let badges: { id: string; badge_type: string; submission_id: string; created_at: string }[] = []
  if (subIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('badges')
      .select('id, badge_type, submission_id, created_at')
      .in('submission_id', subIds)
      .order('created_at', { ascending: false })
    badges = data ?? []
  }

  // Map submission_id → assignment title
  const subTitleMap = new Map(
    (submissions ?? []).map(s => [
      s.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s.assignments as any)?.title ?? 'Tugas',
    ])
  )

  return (
    <div className="p-6 sm:p-8 max-w-3xl">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Dashboard Siswa</p>
        <h1 className="font-display text-2xl font-bold text-gray-900">Badge</h1>
        {badges.length > 0 && (
          <p className="text-sm text-gray-400 mt-1">{badges.length} badge diterima</p>
        )}
      </div>

      {badges.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Award size={28} className="text-gray-200" />
          </div>
          <p className="text-sm font-medium text-gray-500">Belum ada badge</p>
          <p className="text-xs text-gray-400 mt-1">Kumpulkan tugas dengan baik untuk mendapatkan badge dari guru.</p>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {Object.entries(BADGE_META).map(([type, meta]) => {
              const count = badges.filter(b => b.badge_type === type).length
              const Icon = meta.icon
              return (
                <div key={type} className={`border ${meta.border} ${meta.bg} rounded-2xl p-4 text-center`}>
                  <Icon size={20} className={`${meta.color} mx-auto mb-1.5`} />
                  <p className={`font-display text-xl font-bold ${meta.color}`}>{count}</p>
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5 leading-tight">{type}</p>
                </div>
              )
            })}
          </div>

          {/* Badge grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {badges.map(badge => {
              const meta = BADGE_META[badge.badge_type] ?? FALLBACK_META
              const Icon = meta.icon
              const assignmentTitle = subTitleMap.get(badge.submission_id) ?? 'Tugas'

              return (
                <div
                  key={badge.id}
                  className={`flex items-center gap-4 bg-white border ${meta.border} rounded-2xl p-5 hover:shadow-sm transition-shadow`}
                >
                  <div className={`w-12 h-12 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={22} className={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${meta.color}`}>{badge.badge_type}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{assignmentTitle}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(badge.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
