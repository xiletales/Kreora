'use client'
import Link from 'next/link'
import { Heart, Eye } from 'lucide-react'
import { Artwork } from '@/lib/supabase'

const CAT_COLORS: Record<string, string> = {
  painting:     'cat-painting',
  poster:       'cat-poster',
  illustration: 'cat-illustration',
  logo:         'cat-logo',
  digital:      'cat-digital',
  animation:    'cat-animation',
}

interface Props {
  artwork: Artwork
  index?: number
  href?: string
  compact?: boolean
}

export default function ArtworkCard({ artwork, href, compact }: Props) {
  const dest = href || `/gallery/${artwork.id}`
  const catKey = artwork.category?.toLowerCase() || ''
  const catCls = CAT_COLORS[catKey] || 'cat-digital'

  return (
    <Link href={dest} className="block bh-card-inner rounded-xl overflow-hidden group">
      {/* Image */}
      <div className="bh-card-img">
        {artwork.image_url ? (
          <img
            src={artwork.image_url}
            alt={artwork.title}
            className="w-full object-cover"
            style={{ aspectRatio: compact ? '1' : '4/3', display: 'block' }}
          />
        ) : (
          <div className="w-full aspect-square flex items-center justify-center bg-gray-50">
            <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
              <Eye size={20} className="text-gray-400" />
            </div>
          </div>
        )}

        {/* Hover overlay */}
        <div className="bh-card-overlay">
          <span className={`pill text-[10px] ${catCls}`}>{artwork.category}</span>
          <span className="text-white text-xs flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
            <Eye size={10} /> View
          </span>
        </div>
      </div>

      {/* Bottom meta */}
      <div className="bh-card-meta">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #337357, #285e46)' }}>
            {(artwork.profiles?.first_name?.[0] || 'U').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{artwork.title}</p>
            <p className="text-[11px] text-gray-400 truncate">
              {artwork.profiles?.first_name || 'Unknown'} {artwork.profiles?.last_name || ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-rose-300 shrink-0">
          <Heart size={11} fill="currentColor" />
          <span className="text-xs text-gray-500 font-medium">{artwork.likes || 0}</span>
        </div>
      </div>
    </Link>
  )
}
