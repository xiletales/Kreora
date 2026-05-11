export interface BadgeDef {
  name: string
  description: string
  icon: string
}

export const BADGE_DEFS: BadgeDef[] = [
  { name: 'First Submit',    icon: '🥇', description: 'Submitted your first assignment.' },
  { name: 'On Time Streak',  icon: '🔥', description: 'Submitted three assignments before the deadline.' },
  { name: 'All Done',        icon: '✅', description: 'Submitted every assignment from your teacher.' },
  { name: 'Top Grade',       icon: '⭐', description: 'Received an A on an assignment.' },
  { name: 'Perfect Score',   icon: '🏆', description: 'Received an A on every graded assignment.' },
  { name: 'Rising Star',     icon: '🌟', description: 'Got teacher feedback for the first time.' },
]

export const BADGE_BY_NAME: Record<string, BadgeDef> = Object.fromEntries(
  BADGE_DEFS.map(b => [b.name, b]),
)
