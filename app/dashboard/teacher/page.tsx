'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TeacherDashboardRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard?tab=assignments') }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
    </div>
  )
}
