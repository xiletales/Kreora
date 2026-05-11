'use client'
import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  className?: string
  debounceMs?: number
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
  debounceMs = 300,
}: Props) {
  const [local, setLocal] = useState(value)

  // Sync external value when it changes from outside (e.g. cleared on filter change)
  useEffect(() => { setLocal(value) }, [value])

  // Debounced propagation
  useEffect(() => {
    if (local === value) return
    const t = setTimeout(() => onChange(local), debounceMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, debounceMs])

  return (
    <div className={`relative ${className}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        type="text"
        value={local}
        onChange={e => setLocal(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-brand-green-dark rounded-xl text-gray-800 placeholder-gray-500 outline-none focus:border-brand-pink-dark focus:ring-2 focus:ring-brand-pink/40 transition"
      />
      {local && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setLocal('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-800 hover:bg-brand-green rounded-full transition-colors"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
