'use client'
import { useEffect, useRef, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  created_at: string
}

interface Props {
  recipientId: string
  recipientType: 'teacher' | 'student'
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60)         return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60)         return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)          return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.floor(hr / 24)
  if (day < 30)         return `${day} day${day === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

export default function NotificationBell({ recipientId, recipientType }: Props) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  // Initial load + when dropdown opens
  async function loadOnce() {
    if (!recipientId) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('id, type, message, read, created_at')
      .eq('recipient_id', recipientId)
      .eq('recipient_type', recipientType)
      .order('created_at', { ascending: false })
      .limit(10)
    setItems((data ?? []) as Notification[])
    setLoading(false)
  }

  useEffect(() => {
    if (!recipientId) return
    loadOnce()

    // Realtime subscription — degrades gracefully if unavailable
    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel(`notifications-${recipientType}-${recipientId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${recipientId}`,
          },
          payload => {
            const row = payload.new as Notification & { recipient_id?: string }
            if (row.recipient_id && row.recipient_id !== recipientId) return
            setItems(prev => [row, ...prev].slice(0, 10))
          },
        )
        .subscribe()
    } catch (e) {
      console.warn('[NotificationBell] realtime unavailable:', e)
    }

    return () => {
      if (channel) supabase.removeChannel(channel).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientId, recipientType])

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const unread = items.filter(n => !n.read).length

  async function markRead(id: string) {
    setItems(list => list.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  async function markAllRead() {
    if (unread === 0) return
    const ids = items.filter(n => !n.read).map(n => n.id)
    setItems(list => list.map(n => ({ ...n, read: true })))
    if (ids.length > 0) {
      await supabase.from('notifications').update({ read: true }).in('id', ids)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-gray-700 hover:bg-brand-green transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white border border-brand-green-dark rounded-xl shadow-sm z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-green">
            <p className="text-sm font-semibold text-gray-800">Notifications</p>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] font-semibold text-brand-pink-dark hover:underline"
                >
                  Mark all as read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-brand-green"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-xs text-gray-500">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-gray-500">No notifications yet.</p>
            ) : (
              items.map(n => (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-brand-green last:border-b-0 transition-colors ${
                    n.read ? 'bg-white' : 'bg-brand-pink/30'
                  } hover:bg-brand-green`}
                >
                  <p className={`text-xs leading-relaxed ${n.read ? 'text-gray-700' : 'text-gray-800 font-medium'}`}>
                    {n.message}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">{timeAgo(n.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
