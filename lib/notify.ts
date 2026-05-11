import { createClient, SupabaseClient } from '@supabase/supabase-js'

const getAdmin = (): SupabaseClient =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

export type NotifyType =
  | 'new_submission'
  | 'grade_received'
  | 'feedback_received'
  | 'deadline_reminder'
  | 'badge_earned'

async function insertNotification(
  recipientId: string,
  recipientType: 'teacher' | 'student',
  type: NotifyType,
  message: string,
) {
  if (!recipientId || !message) return
  try {
    const { error } = await getAdmin().from('notifications').insert({
      recipient_id: recipientId,
      recipient_type: recipientType,
      type,
      message,
    })
    if (error) {
      // Swallow — notifications must not break the primary flow
      console.warn('[notify] insert failed:', error.message)
    }
  } catch (e) {
    console.warn('[notify] threw:', e)
  }
}

export async function notifyTeacher(teacherId: string, type: NotifyType, message: string) {
  return insertNotification(teacherId, 'teacher', type, message)
}

export async function notifyStudent(nisn: string, type: NotifyType, message: string) {
  return insertNotification(nisn, 'student', type, message)
}
