import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '@/lib/supabase'

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const supabase = createSupabaseServerClient(cookies, request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 })
    }

    const formData = await request.formData()
    const signerName = formData.get('signer_name') as string
    const signerEmail = formData.get('signer_email') as string
    const signerPhone = formData.get('signer_phone') as string
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