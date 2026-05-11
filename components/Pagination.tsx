'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export default function Pagination({ currentPage, totalPages, onPageChange, className = '' }: Props) {
  if (totalPages <= 1) return null

  const prev = () => onPageChange(Math.max(1, currentPage - 1))
  const next = () => onPageChange(Math.min(totalPages, currentPage + 1))

  return (
    <div className={`flex items-center justify-between gap-3 mt-5 ${className}`}>
      <button
        type="button"
        onClick={prev}
        disabled={currentPage <= 1}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-brand-green-dark text-gray-700 bg-white hover:bg-brand-green disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={14} /> Prev
      </button>

      <span className="text-xs font-medium text-gray-700">
        Page <span className="font-bold text-gray-800">{currentPage}</span> of {totalPages}
      </span>

      <button
        type="button"
        onClick={next}
        disabled={currentPage >= totalPages}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-green-dark text-white hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next <ChevronRight size={14} />
      </button>
    </div>
  )
}
