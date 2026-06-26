import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export const GET: APIRoute = async ({ cookies, request, params }) => {
  try {
    const supabase = createSupabaseServerClient(cookies, request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 })
    }

    const supabaseAdmin = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: signature } = await supabaseAdmin
      .from('signatures')
      .select('pdf_path, photographer_id')
      .eq('id', params.id)
      .eq('photographer_id', user.id)
      .maybeSingle()

    if (!signature?.pdf_path) {
      return new Response(JSON.stringify({ error: 'PDF introuvable' }), { status: 404 })
    }

    const { data: signed } = await supabaseAdmin.storage
      .from('signatures')
      .createSignedUrl(signature.pdf_path, 3600)

    return new Response(
      JSON.stringify({ url: signed?.signedUrl ?? null }),
      { status: 200 }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}