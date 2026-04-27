import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(req: NextRequest) {
  try {
    const raw = req.cookies.get('kreora_student_session')?.value
    if (!raw) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = JSON.parse(raw)
    const nisn: string = session?.nisn
    if (!nisn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await req.formData()
    const displayName = (form.get('display_name') as string ?? '').trim()
    const bio = (form.get('bio') as string ?? '').trim()
    const file = form.get('avatar') as File | null

    let photoUrl: string | null = session.photo_url ?? null

    // Upload new avatar if provided
    if (file && file.size > 0) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `students/${nisn}/avatar.${ext}`
      const bytes = await file.arrayBuffer()

      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(path, bytes, { contentType: file.type, upsert: true })

      if (uploadError) {
        return NextResponse.json({ error: 'Gagal upload foto.' }, { status: 500 })
      }

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('avatars')
        .getPublicUrl(path)

      photoUrl = `${publicUrl}?t=${Date.now()}`
    }

    // Update students table
    const { error: dbError } = await supabaseAdmin
      .from('students')
      .update({ display_name: displayName || null, bio: bio || null, photo_url: photoUrl })
      .eq('nisn', nisn)

    if (dbError) return NextResponse.json({ error: 'Gagal menyimpan profil.' }, { status: 500 })

    // Refresh cookie with updated values
    const updatedSession = {
      ...session,
      name: displayName || session.name,
      photo_url: photoUrl,
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set('kreora_student_session', JSON.stringify(updatedSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan.' }, { status: 500 })
  }
}
