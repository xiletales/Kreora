import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { submission_id, user_identifier } = await req.json()

  if (!submission_id || !user_identifier) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('likes')
    .select('id')
    .eq('submission_id', submission_id)
    .eq('nisn', user_identifier)
    .single()

  if (existing) {
    await supabaseAdmin
      .from('likes')
      .delete()
      .eq('id', existing.id)

    const { count } = await supabaseAdmin
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submission_id)

    return NextResponse.json({ liked: false, count: count || 0 })
  } else {
    await supabaseAdmin
      .from('likes')
      .insert({
        submission_id,
        nisn: user_identifier,
      })

    const { count } = await supabaseAdmin
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submission_id)

    return NextResponse.json({ liked: true, count: count || 0 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const submission_id = searchParams.get('submission_id')
  const user_identifier = searchParams.get('user_identifier')

  if (!submission_id) return NextResponse.json({ count: 0, liked: false })

  const { count } = await supabaseAdmin
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('submission_id', submission_id)

  let liked = false
  if (user_identifier) {
    const { data } = await supabaseAdmin
      .from('likes')
      .select('id')
      .eq('submission_id', submission_id)
      .eq('nisn', user_identifier)
      .single()
    liked = !!data
  }

  return NextResponse.json({ count: count || 0, liked })
}
