import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { first_name, last_name, username, nisn, grade, class: className } =
      await req.json()

    if (!first_name || !username || !nisn) {
      return new Response(
        JSON.stringify({ error: 'first_name, username and nisn are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Derive a stable email from the username so auth can store it
    const email = `${username}@kreora.internal`

    // Check if username already taken
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Username already taken' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create auth user; password = NISN
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: nisn,
        email_confirm: true,
        user_metadata: { first_name, last_name, role: 'student', username },
      })

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: authError?.message ?? 'Failed to create auth user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Upsert profile
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      username,
      first_name,
      last_name,
      nisn,
      email,
      grade: grade ?? null,
      class: className ?? null,
      role: 'student',
      created_at: new Date().toISOString(),
    })

    if (profileError) {
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, userId: authData.user.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
