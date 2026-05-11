import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { BADGE_DEFS } from '@/lib/badges'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BadgeRow {
  id: string
  name: string
  description: string | null
  earned_at: string
}

export default async function StudentBadgesPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('kreora_student_session')?.value
  if (!raw) redirect('/login')

  const { nisn } = JSON.parse(raw)

  const { data: rows } = await getAdmin()
    .from('badges')
    .select('id, name, description, earned_at')
    .eq('nisn', nisn)
    .order('earned_at', { ascending: false })

  const earned = (rows ?? []) as BadgeRow[]
  const earnedMap = new Map(earned.map(b => [b.name, b]))

  // Build the catalog: every defined badge, marked earned/locked
  const catalog = BADGE_DEFS.map(def => {
    const e = earnedMap.get(def.name)
    return {
      def,
      earned: !!e,
      earnedAt: e?.earned_at ?? null,
    }
  })

  const earnedCount = catalog.filter(c => c.earned).length

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-6 pb-10">

      <div className="mb-8">
        <p className="text-xs font-semibold text-brand-pink-dark uppercase tracking-widest mb-1">Student Dashboard</p>
        <h1 className="font-display text-2xl font-bold text-gray-800">Badges</h1>
        <p className="text-sm text-gray-600 mt-1">
          {earnedCount} of {BADGE_DEFS.length} badges earned
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-6 bg-white border border-brand-green-dark rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700">Collection progress</span>
          <span className="text-xs font-bold text-gray-800">{Math.round((earnedCount / BADGE_DEFS.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-brand-green rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-green-dark rounded-full transition-all"
            style={{ width: `${(earnedCount / BADGE_DEFS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalog.map(({ def, earned, earnedAt }, i) => {
          const cardBg = earned
            ? (i % 2 === 0 ? 'bg-brand-pink' : 'bg-brand-green')
            : 'bg-brand-off-white'

          return (
            <div
              key={def.name}
              className={`${cardBg} border ${earned ? 'border-brand-green-dark' : 'border-brand-green-dark/40'} rounded-2xl p-5 transition-all ${
                earned ? '' : 'opacity-50 grayscale'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shrink-0 text-3xl">
                  {def.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">{def.name}</p>
                  <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{def.description}</p>
                  {earned && earnedAt ? (
                    <p className="text-[10px] font-semibold text-brand-green-dark mt-2 uppercase tracking-wide">
                      Earned {new Date(earnedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  ) : (
                    <p className="text-[10px] font-semibold text-gray-500 mt-2 uppercase tracking-wide">Locked</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
