// src/pages/api/signatures/[id]/verify-otp.ts
import type { APIRoute } from 'astro'
import { createClient } from '@supabase/supabase-js'
import { checkOrigin } from '@/lib/csrf'

export const POST: APIRoute = async ({ request, params }) => {
  if (!checkOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Origine non autorisée' }), { status: 403 })
  }

  try {
    const { id } = params
    const { otp } = await request.json()

    if (!otp || typeof otp !== 'string') {
      return new Response(JSON.stringify({ error: 'Code manquant' }), { status: 400 })
    }

    const supabaseAdmin = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: signature } = await supabaseAdmin
      .from('signatures')
      .select('id, status, otp_code, otp_expires_at, otp_verified_at, signature_mode')
      .eq('id', id)
      .maybeSingle()

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Signature introuvable' }), { status: 404 })
    }

    if (signature.status === 'signed') {
      return new Response(JSON.stringify({ error: 'Déjà signée' }), { status: 409 })
    }

    if (signature.otp_verified_at) {
      // Déjà vérifié — on laisse passer (rechargement de page)
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    if (!signature.otp_code || !signature.otp_expires_at) {
      return new Response(JSON.stringify({ error: 'Aucun code associé à cette signature' }), { status: 400 })
    }

    // Vérifie l'expiration
    if (new Date() > new Date(signature.otp_expires_at)) {
      return new Response(JSON.stringify({ error: 'Code expiré. Demandez un nouveau lien au photographe.' }), { status: 410 })
    }

    // Vérifie le code
    if (otp.trim() !== signature.otp_code) {
      return new Response(JSON.stringify({ error: 'Code incorrect.' }), { status: 401 })
    }

    // Marque comme vérifié
    await supabaseAdmin
      .from('signatures')
      .update({ otp_verified_at: new Date().toISOString() })
      .eq('id', id)

    return new Response(JSON.stringify({ success: true }), { status: 200 })

  } catch (err: any) {
    console.error('Erreur verify-otp:', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Erreur serveur' }), { status: 500 })
  }
}