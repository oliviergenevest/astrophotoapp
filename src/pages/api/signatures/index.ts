import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '@/lib/supabase'
import { sanitizeText, sanitizeEmail } from '@/lib/sanitize'
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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 })
    }

    const formData = await request.formData()
    const signerName = sanitizeText(formData.get('signer_name'))
    const signerEmail = sanitizeEmail(formData.get('signer_email'))
    const signerPhone = sanitizeText(formData.get('signer_phone'))

    if (!signerName) {
      return new Response(JSON.stringify({ error: 'Nom invalide' }), { status: 400 })
    }
    if (!signerEmail) {
      return new Response(JSON.stringify({ error: 'Email invalide' }), { status: 400 })
  }
    const photo = formData.get('photo') as File | null

    if (!signerName || !signerEmail) {
      return new Response(JSON.stringify({ error: 'Nom et email obligatoires' }), { status: 400 })
    }

    // Récupère le contrat actif
    const { data: activeContract } = await supabase
      .from('contracts')
      .select('id, file_path')
      .eq('photographer_id', user.id)
      .eq('is_active', true)
      .single()

    if (!activeContract) {
      return new Response(
        JSON.stringify({ error: 'Aucun contrat actif. Activez un contrat dans Mes contrats.' }),
        { status: 400 }
      )
    }

    let photoPath: string | null = null

    // Upload de la photo si fournie
    if (photo && photo.size > 0) {
      const ext = photo.name.split('.').pop()
      photoPath = `${user.id}/${Date.now()}_photo.${ext}`

      const { error: photoError } = await supabase.storage
        .from('signatures')
        .upload(photoPath, photo)

      if (photoError) throw new Error(photoError.message)
    }

    // Récupère l'IP
    const ip = request.headers.get('x-forwarded-for')
      ?? request.headers.get('x-real-ip')
      ?? 'inconnue'

    // Crée la signature en base
    const { data: newSignature, error: dbError } = await supabase
      .from('signatures')
      .insert({
        photographer_id: user.id,
        contract_id: activeContract.id,
        signer_name: signerName.trim(),
        signer_email: signerEmail.trim(),
        signer_phone: signerPhone?.trim() || null,
        photo_path: photoPath,
        ip_address: ip,
        status: 'pending',
      })
      .select()
      .single()

    if (dbError) throw new Error(dbError.message)

    return new Response(
      JSON.stringify({ id: newSignature.id }),
      { status: 201 }
    )

  } catch (err: any) {
    console.error('Erreur API signatures POST:', err)
    return new Response(
      JSON.stringify({ error: err.message ?? 'Erreur serveur' }),
      { status: 500 }
    )
  }
}

export const GET: APIRoute = async ({ cookies, request }) => {
  try {
    const supabase = createSupabaseServerClient(cookies, request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 })
    }

    const url = new URL(request.url)
    const search = url.searchParams.get('search') ?? ''
    const page = parseInt(url.searchParams.get('page') ?? '1')
    const perPage = 10

    // Requête de base
    let query = supabase
      .from('signatures')
      .select('id, signer_name, signer_email, signed_at, status, pdf_path, contract_name, contracts(name)', { count: 'exact' })
      .eq('photographer_id', user.id)
      .order('signed_at', { ascending: false })

    // Filtre recherche
    if (search.trim()) {
      query = query.or(`signer_name.ilike.%${search}%,signer_email.ilike.%${search}%`)
    }

    // Pagination
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    query = query.range(from, to)

    const { data: signatures, count, error } = await query

    if (error) throw new Error(error.message)

    // Génère les URLs signées
    const signaturesWithUrls = await Promise.all(
      (signatures ?? []).map(async (sig) => {
        if (!sig.pdf_path) return { ...sig, signed_url: null }
        const { data } = await supabase.storage
          .from('signatures')
          .createSignedUrl(sig.pdf_path, 3600)
        return { ...sig, signed_url: data?.signedUrl ?? null }
      })
    )

    return new Response(JSON.stringify({
      signatures: signaturesWithUrls,
      total: count ?? 0,
      page,
      perPage,
      totalPages: Math.ceil((count ?? 0) / perPage),
    }), { status: 200 })

  } catch (err: any) {
    console.error('Erreur GET signatures:', err)
    return new Response(
      JSON.stringify({ error: err.message ?? 'Erreur serveur' }),
      { status: 500 }
    )
  }
}