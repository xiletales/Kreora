import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Trophy, Sparkles, Wrench, Lightbulb, Award } from 'lucide-react'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BADGE_META: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  'Best Work':       { icon: Trophy,    color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100'  },
  'Most Creative':   { icon: Sparkles,  color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-100' },
  'Great Technique': { icon: Wrench,    color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-100'   },
  'Innovative':      { icon: Lightbulb, color: 'text-orange-500', bg: 'bg-orange-50',  border: 'border-orange-100' },
  'First Submission':{ icon: Award,     color: 'text-[#337357]',  bg: 'bg-[#337357]/10', border: 'border-[#337357]/20' },
  'Creative Star':   { icon: Sparkles,  color: 'text-[#E27396]',  bg: 'bg-[#FFDBE5]/60', border: 'border-[#EA9AB2]/40' },
  'Published Artist':{ icon: Trophy,    color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100'  },
}

const FALLBACK_META = { icon: Award, color: 'text-[#E27396]', bg: 'bg-[#FFDBE5]/60', border: 'border-[#EA9AB2]/40' }

export default async function StudentBadgesPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('kreora_student_session')?.value
  if (!raw) redirect('/login')

  const { nisn } = JSON.parse(raw)

  const { data: submissions } = await getAdmin()
    .from('submissions')
    .select('id, assignment_id, assignments(title)')
    .eq('nisn', nisn)

  const subIds = (submissions ?? []).map(s => s.id)

  let badges: { id: string; badge_type: string; submission_id: string; created_at: string }[] = []
  if (subIds.length > 0) {
    const { data } = await getAdmin()
      .from('badges')
      .select('id, badge_type, submission_id, created_at')
      .in('submission_id', subIds)
      .order('created_at', { ascending: false })
    badges = data ?? []
  }

  const subTitleMap = new Map(
    (submissions ?? []).map(s => [
      s.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s.assignments as any)?.title ?? 'Assignment',
    ])
  )

  const summaryTypes = Object.keys(BADGE_META).slice(0, 4)

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-6 pb-10">

      <div className="mb-8">
        <p className="text-xs font-semibold text-brand-pink-dark uppercase tracking-widest mb-1">Student Dashboard</p>
        <h1 className="font-display text-2xl font-bold text-gray-800">Badges</h1>
        {badges.length > 0 && (
          <p className="text-sm text-gray-600 mt-1">{badges.length} badge{badges.length === 1 ? '' : 's'} earned</p>
        )}
      </div>

      {badges.length === 0 ? (
        <div className="text-center py-20 bg-white border border-brand-green-dark rounded-2xl">
          <div className="w-16 h-16 bg-brand-pink rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Award size={28} className="text-brand-pink-dark" />
          </div>
          <p className="text-sm font-medium text-gray-800">No badges yet</p>
          <p className="text-xs text-gray-600 mt-1">Submit your assignments to earn badges from your teacher.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {summaryTypes.map((type, i) => {
              const meta = BADGE_META[type]
              const count = badges.filter(b => b.badge_type === type).length
              const Icon = meta.icon
              const cardBg = i % 2 === 0 ? 'bg-brand-pink' : 'bg-brand-green'
              return (
                <div key={type} className={`${cardBg} border border-brand-green-dark rounded-2xl p-4 text-center`}>
                  <Icon size={20} className={`${meta.color} mx-auto mb-1.5`} />
                  <p className="font-display text-xl font-bold text-gray-800">{count}</p>
                  <p className="text-[10px] font-medium text-gray-700 mt-0.5 leading-tight">{type}</p>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map(badge => {
              const meta = BADGE_META[badge.badge_type] ?? FALLBACK_META
              const Icon = meta.icon
              const assignmentTitle = subTitleMap.get(badge.submission_id) ?? 'Assignment'

              return (
                <div
                  key={badge.id}
                  className="flex items-center gap-4 bg-white border border-brand-green-dark rounded-2xl p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-pink flex items-center justify-center shrink-0">
                    <Icon size={22} className="text-brand-pink-dark" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{badge.badge_type}</p>
                    <p className="text-xs text-gray-600 mt-0.5 truncate">{assignmentTitle}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(badge.created_at).toLocaleDateString('en-US', {
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
