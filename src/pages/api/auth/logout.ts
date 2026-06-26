import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '@/lib/supabase'
import { checkOrigin } from '@/lib/csrf'

export const POST: APIRoute = async ({ cookies, request, redirect }) => {
   
  if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisée' }),
      { status: 403 }
    )
  }
  const supabase = createSupabaseServerClient(cookies, request)
  await supabase.auth.signOut()
  return redirect('/login')
}