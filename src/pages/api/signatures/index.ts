import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { checkOrigin } from '@/lib/csrf'
import { sanitizeText, sanitizeEmail } from '@/lib/sanitize'

export const POST: APIRoute = async ({ cookies, request }) => {
  if (!checkOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Origine non autorisée' }), { status: 403 })
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
    const signatureMode = formData.get('signature_mode') as string ?? 'kiosque'
    const photo = formData.get('photo') as File | null
 
    if (!signerName) return new Response(JSON.stringify({ error: 'Nom invalide' }), { status: 400 })
    if (!signerEmail) return new Response(JSON.stringify({ error: 'Email invalide' }), { status: 400 })
    if (!['kiosque', 'distance'].includes(signatureMode)) {
      return new Response(JSON.stringify({ error: 'Mode invalide' }), { status: 400 })
    }
 
    const supabaseAdmin = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    )
 
    // Récupère le contrat actif
    const { data: activeContract } = await supabaseAdmin
      .from('contracts')
      .select('id, name')
      .eq('photographer_id', user.id)
      .eq('is_active', true)
      .single()
 
    if (!activeContract) {
      return new Response(JSON.stringify({ error: 'Aucun contrat actif.' }), { status: 400 })
    }
 
    let photoPath: string | null = null
    if (photo && photo.size > 0) {
      const ext = photo.name.split('.').pop()
      photoPath = `${user.id}/${Date.now()}_photo.${ext}`
      const { error: photoError } = await supabaseAdmin.storage
        .from('signatures')
        .upload(photoPath, photo)
      if (photoError) throw new Error(photoError.message)
    }
 
    const ip = request.headers.get('x-forwarded-for')
      ?? request.headers.get('x-real-ip')
      ?? (import.meta.env.DEV ? '127.0.0.1 (local)' : 'inconnue')
 
    // Génère OTP si mode distance
    let otpCode: string | null = null
    let otpExpiresAt: string | null = null
 
    if (signatureMode === 'distance') {
      otpCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiry = new Date()
      expiry.setMinutes(expiry.getMinutes() + 15)
      otpExpiresAt = expiry.toISOString()
    }
 
    // Crée la signature
    const { data: newSignature, error: dbError } = await supabaseAdmin
      .from('signatures')
      .insert({
        photographer_id: user.id,
        contract_id: activeContract.id,
        signer_name: signerName,
        signer_email: signerEmail,
        signer_phone: signerPhone || null,
        photo_path: photoPath,
        ip_address: ip,
        status: 'pending',
        signature_mode: signatureMode,
        otp_code: otpCode,
        otp_expires_at: otpExpiresAt,
      })
      .select()
      .single()
 
    if (dbError) throw new Error(dbError.message)
 
    // Envoie l'email avec le lien si mode distance
    if (signatureMode === 'distance' && otpCode) {
      const siteUrl = import.meta.env.SITE_URL
      const signLink = `${siteUrl}/signer/${newSignature.id}`
 
      const resend = new Resend(import.meta.env.RESEND_API_KEY)
      await resend.emails.send({
        from: import.meta.env.RESEND_FROM_EMAIL,
        to: signerEmail,
        subject: `Votre autorisation de droit à l'image – ${activeContract.name}`,
        html: `
          <div style="background:#0F1923; padding:40px 16px; font-family:'DM Sans', Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto; background:#1A2733; border-radius:12px; overflow:hidden; border:0.5px solid #334155;">
 
              <tr>
                <td style="padding:28px 32px; background:#0F1923; border-bottom:0.5px solid #334155;">
                  <span style="font-family:'Syne', Arial, sans-serif; font-weight:700; font-size:20px; color:#F5F0E8;">Signa</span>
                </td>
              </tr>
 
              <tr>
                <td style="padding:32px 32px 24px; text-align:center;">
                  <p style="font-family:'Syne', Arial, sans-serif; font-weight:700; font-size:20px; color:#F5F0E8; margin:0 0 8px;">
                    Vous avez une autorisation à signer
                  </p>
                  <p style="font-family:'DM Sans', Arial, sans-serif; font-size:14px; color:#8A9BAB; margin:0; line-height:1.6;">
                    Bonjour ${signerName}, vous avez reçu une demande de signature pour le contrat <strong style="color:#C9A84C;">${activeContract.name}</strong>.
                  </p>
                </td>
              </tr>
 
              <tr>
                <td style="padding:0 32px 24px; text-align:center;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                    <tr>
                      <td style="background:#AAFF00; border-radius:10px;">
                        <a href="${signLink}" style="display:inline-block; padding:13px 28px; font-family:'Syne', Arial, sans-serif; font-weight:700; font-size:14px; color:#0F1923; text-decoration:none;">
                          Accéder au document →
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
 
              <tr>
                <td style="padding:0 32px 32px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(201,168,76,0.06); border:0.5px solid rgba(201,168,76,0.2); border-radius:10px;">
                    <tr>
                      <td style="padding:18px 20px; text-align:center;">
                        <p style="font-family:'DM Sans', Arial, sans-serif; font-size:12px; color:#C9A84C; margin:0 0 8px;">Votre code de vérification</p>
                        <p style="font-family:'Syne', Arial, sans-serif; font-size:32px; font-weight:700; color:#F5F0E8; margin:0; letter-spacing:0.2em;">${otpCode}</p>
                        <p style="font-family:'DM Sans', Arial, sans-serif; font-size:11px; color:#5C6B7A; margin:8px 0 0;">Valable 15 minutes</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
 
              <tr>
                <td style="padding:20px 32px 28px; border-top:0.5px solid #334155;">
                  <p style="font-family:'DM Sans', Arial, sans-serif; font-size:11px; color:#5C6B7A; margin:0; line-height:1.7; text-align:center;">
                    Ce lien est personnel et sécurisé. Ne le partagez pas.<br>
                    Envoyé par Signa au nom du photographe.
                  </p>
                </td>
              </tr>
 
            </table>
          </div>
        `,
      })
    }
 
    return new Response(
      JSON.stringify({ id: newSignature.id, mode: signatureMode }),
      { status: 201 }
    )
 
  } catch (err: any) {
    console.error('Erreur POST signature:', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Erreur serveur' }), { status: 500 })
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
      .select('id, signer_name, signer_email, signer_phone, signed_at, status, pdf_path, contract_name, contracts(name)', { count: 'exact' })
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