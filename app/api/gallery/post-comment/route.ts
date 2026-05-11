import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { text, submission_id, author_nisn, guest_name } = await req.json()

  if (!text?.trim() || !submission_id) {
    return NextResponse.json({ error: 'Text and submission_id are required' }, { status: 400 })
  }

  // No guest_name column on comments — store the clean text and return guest_name
  // separately so the client can render it without a schema change.
  const { data, error } = await supabaseAdmin
    .from('comments')
    .insert({
      text: text.trim(),
      submission_id,
      author_nisn: author_nisn || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Comment error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({
    success: true,
    comment: { ...data, guest_name: guest_name || null },
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const submission_id = searchParams.get('submission_id')
  if (!submission_id) return NextResponse.json({ comments: [] })

  const { data } = await supabaseAdmin
    .from('comments')
    .select('*')
    .eq('submission_id', submission_id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ comments: data || [] })
}
