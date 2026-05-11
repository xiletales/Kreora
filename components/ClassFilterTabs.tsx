'use client'

interface Props {
  classes: string[]
  selected: string
  onChange: (cls: string) => void
  className?: string
}

export const ALL_CLASSES = 'All Classes'

export default function ClassFilterTabs({ classes, selected, onChange, className = '' }: Props) {
  const tabs = [ALL_CLASSES, ...classes.filter(c => c && c !== ALL_CLASSES)]

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {tabs.map(c => {
        const isActive = c === selected
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-brand-green-dark text-white border border-brand-green-dark'
                : 'bg-white border border-brand-green-dark text-gray-600 hover:bg-brand-green'
            }`}
          >
            {c}
          </button>
        )
      })}
    </div>
  )
}
