import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { checkOrigin } from '@/lib/csrf'

export const POST: APIRoute = async ({ cookies, request, params }) => {
  if (!checkOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Origine non autorisée' }), { status: 403 })
  }

  try {
    const supabase = createSupabaseServerClient(cookies, request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 })
    }

    const { id } = params

    const supabaseAdmin = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Récupère la signature
    const { data: signature } = await supabaseAdmin
      .from('signatures')
      .select('id, status, signature_mode, signer_name, signer_email, photographer_id, contracts(name)')
      .eq('id', id)
      .eq('photographer_id', user.id)
      .maybeSingle()

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Signature introuvable' }), { status: 404 })
    }

    if (signature.status === 'signed') {
      return new Response(JSON.stringify({ error: 'Déjà signée' }), { status: 409 })
    }

    if (signature.signature_mode !== 'distance') {
      return new Response(JSON.stringify({ error: 'Non applicable en mode kiosque' }), { status: 400 })
    }

    // Génère un nouveau code OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiry = new Date()
    expiry.setMinutes(expiry.getMinutes() + 15)

    await supabaseAdmin
      .from('signatures')
      .update({
        otp_code: otpCode,
        otp_expires_at: expiry.toISOString(),
        otp_verified_at: null, // remet à zéro si déjà vérifié
      })
      .eq('id', id)

    // Renvoie l'email
    const contract = signature.contracts as any
    const siteUrl = import.meta.env.SITE_URL
    const signLink = `${siteUrl}/signer/${id}`

    const resend = new Resend(import.meta.env.RESEND_API_KEY)
    await resend.emails.send({
      from: import.meta.env.RESEND_FROM_EMAIL,
      to: signature.signer_email,
      subject: `Rappel – Votre autorisation de droit à l'image – ${contract.name}`,
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
                  Rappel — document en attente de signature
                </p>
                <p style="font-family:'DM Sans', Arial, sans-serif; font-size:14px; color:#8A9BAB; margin:0; line-height:1.6;">
                  Bonjour ${signature.signer_name}, voici un nouveau lien pour signer le contrat <strong style="color:#C9A84C;">${contract.name}</strong>.
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
                      <p style="font-family:'DM Sans', Arial, sans-serif; font-size:12px; color:#C9A84C; margin:0 0 8px;">Nouveau code de vérification</p>
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
                  Envoyé par Crespeau Photo au nom du photographe.
                </p>
              </td>
            </tr>

          </table>
        </div>
      `,
    })

    return new Response(JSON.stringify({ success: true }), { status: 200 })

  } catch (err: any) {
    console.error('Erreur resend-otp:', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Erreur serveur' }), { status: 500 })
  }
}