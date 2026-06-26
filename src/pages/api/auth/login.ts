import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '@/lib/supabase'
import { checkOrigin } from '@/lib/csrf'

export const POST: APIRoute = async ({ cookies, request }) => {
  
   if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisée' }),
      { status: 403 }
    )
  }
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email et mot de passe obligatoires' }),
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient(cookies, request)
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Email ou mot de passe incorrect.' }),
        { status: 401 }
      )
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message ?? 'Erreur serveur' }),
      { status: 500 }
    )
  }
}