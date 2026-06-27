import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { isPDFValid } from '@/lib/sanitize'
import { checkOrigin } from '@/lib/csrf'

export const PATCH: APIRoute = async ({ cookies, request, params }) => {
  if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisée' }),
      { status: 403 }
    )
  }
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

    const { id } = params
    const formData = await request.formData()
    const name = formData.get('name') as string
    const file = formData.get('file') as File | null

    if (!name?.trim()) {
      return new Response(JSON.stringify({ error: 'Nom obligatoire' }), { status: 400 })
    }

    // Récupère le contrat existant
    const { data: existing } = await supabaseAdmin
      .from('contracts')
      .select('id, file_path, photographer_id')
      .eq('id', id)
      .eq('photographer_id', user.id)
      .maybeSingle()

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Contrat introuvable' }), { status: 404 })
    }

    let filePath = existing.file_path

    // Si un nouveau PDF est fourni
    if (file && file.size > 0) {
     if (file.type !== 'application/pdf' || !(await isPDFValid(file))) {
        return new Response(JSON.stringify({ error: 'Le fichier doit être un PDF valide' }), { status: 400 })
      }
      if (file.size > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'Fichier trop lourd (10 Mo max)' }), { status: 400 })
      }

      // Upload du nouveau fichier
      const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
      const newFilePath = `${user.id}/${Date.now()}_${safeName}`
      const { error: uploadError } = await supabaseAdmin.storage
        .from('contracts')
        .upload(newFilePath, file)

      if (uploadError) throw new Error(uploadError.message)

      // Supprime l'ancien fichier
      await supabaseAdmin.storage
        .from('contracts')
        .remove([existing.file_path])

      filePath = newFilePath
    }

    // Met à jour en base
    const { data: updated, error: dbError } = await supabaseAdmin
      .from('contracts')
      .update({ name: name.trim(), file_path: filePath })
      .eq('id', id)
      .select()
      .single()

    if (dbError) throw new Error(dbError.message)

    // Génère une URL signée fraîche
    const { data: signed } = await supabaseAdmin.storage
      .from('contracts')
      .createSignedUrl(filePath, 3600)

    return new Response(
      JSON.stringify({ ...updated, signed_url: signed?.signedUrl ?? null }),
      { status: 200 }
    )

  } catch (err: any) {
    console.error('Erreur PATCH contract edit:', err)
    return new Response(
      JSON.stringify({ error: err.message ?? 'Erreur serveur' }),
      { status: 500 }
    )
  }
}