import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '@/lib/supabase'
import { sanitizeText, isPDFValid } from '@/lib/sanitize'
import { checkOrigin } from '@/lib/csrf'



export const POST: APIRoute = async ({ cookies, request }) => {
  if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisée' }),
      { status: 403 }
    )
  }
  try {
    const supabase = createSupabaseServerClient(cookies, request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    /*console.log('=== API /contracts POST ===')
    console.log('Auth error:', authError)
    console.log('User:', user?.id ?? 'NON AUTHENTIFIÉ')
*/
    if (!user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    const name = sanitizeText(formData.get('name'))
    if (!name) {
      return new Response(JSON.stringify({ error: 'Nom invalide' }), { status: 400 })
    }
/*
    console.log('File:', file?.name, file?.type, file?.size)
    console.log('Name:', name)
*/

    if (!file || !name) {
      return new Response(JSON.stringify({ error: 'Données manquantes' }), { status: 400 })
    }

   if (file.type !== 'application/pdf' || !(await isPDFValid(file))) {
  return new Response(JSON.stringify({ error: 'Le fichier doit être un PDF valide' }), { status: 400 })
}
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Fichier trop lourd (10 Mo max)' }), { status: 400 })
    }

    const { count } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('photographer_id', user.id)

   // console.log('Count contrats existants:', count)

    const filePath = `${user.id}/${Date.now()}_${file.name}`
   // console.log('File path:', filePath)

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(filePath, file)

 //   console.log('Upload error:', uploadError)

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 })
    }

    const { data: newContract, error: dbError } = await supabase
      .from('contracts')
      .insert({
        photographer_id: user.id,
        name: name.trim(),
        file_path: filePath,
        is_active: count === 0,
      })
      .select()
      .single()

   // console.log('DB error:', dbError)
    // console.log('New contract:', newContract)

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), { status: 500 })
    }

    const { data: signed } = await supabase.storage
      .from('contracts')
      .createSignedUrl(filePath, 3600)

    return new Response(
      JSON.stringify({ ...newContract, signed_url: signed?.signedUrl ?? null }),
      { status: 201 }
    )

  } catch (err: any) {
    console.error('=== ERREUR INATTENDUE ===', err)
    return new Response(
      JSON.stringify({ error: err.message ?? 'Erreur serveur inattendue' }),
      { status: 500 }
    )
  }
}