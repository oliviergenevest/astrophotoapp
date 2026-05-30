import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { Resend } from 'resend'

export const GET: APIRoute = async ({ cookies, request, params }) => {
  try {
    const supabase = createSupabaseServerClient(cookies, request)
    const { id } = params

    const { data: signature, error } = await supabase
      .from('signatures')
      .select('id, signer_name, status, contracts(file_path, name)')
      .eq('id', id)
      .single()

    if (error || !signature) {
      return new Response(JSON.stringify({ error: 'Signature introuvable' }), { status: 404 })
    }

    if (signature.status === 'signed') {
      return new Response(JSON.stringify({ error: 'Déjà signé' }), { status: 409 })
    }

    const contract = signature.contracts as any
    const { data: signed } = await supabase.storage
      .from('contracts')
      .createSignedUrl(contract.file_path, 3600)

    return new Response(JSON.stringify({
      id: signature.id,
      signer_name: signature.signer_name,
      contract_name: contract.name,
      contract_url: signed?.signedUrl ?? null,
    }), { status: 200 })

  } catch (err: any) {
    console.error('Erreur GET signature:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export const PATCH: APIRoute = async ({ request, params }) => {
  try {
    const { id } = params
    const body = await request.json()
    const { signature_data } = body

    if (!signature_data) {
      return new Response(JSON.stringify({ error: 'Signature manquante' }), { status: 400 })
    }

    const supabaseAdmin = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Récupère la signature + contrat + infos photographe
    const { data: existing, error: findError } = await supabaseAdmin
      .from('signatures')
      .select(`
        id, status, signer_name, signer_email, signed_at,
        contracts(file_path, name),
        photographer_id
      `)
      .eq('id', id)
      .maybeSingle()

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Signature introuvable' }), { status: 404 })
    }

    if (existing.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Déjà signée' }), { status: 409 })
    }

    // ─── 1. Upload de la signature PNG ───────────────────────────────
    const base64Data = signature_data.replace(/^data:image\/png;base64,/, '')
    const signatureBuffer = Buffer.from(base64Data, 'base64')
    const signaturePath = `${id}/signature_${Date.now()}.png`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('signatures')
      .upload(signaturePath, signatureBuffer, { contentType: 'image/png' })

    if (uploadError) throw new Error('Upload signature: ' + uploadError.message)

    // ─── 2. Génération du PDF signé ──────────────────────────────────
    const contract = existing.contracts as any

    // Télécharge le PDF original
    const { data: contractFile } = await supabaseAdmin.storage
      .from('contracts')
      .download(contract.file_path)

    if (!contractFile) throw new Error('Impossible de télécharger le contrat PDF')

    const contractBuffer = await contractFile.arrayBuffer()
    const pdfDoc = await PDFDocument.load(contractBuffer)

    // Ajoute une page de signature à la fin
    const signaturePage = pdfDoc.addPage()
    const { width, height } = signaturePage.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const signedAt = new Date()
    const dateStr = signedAt.toLocaleDateString('fr-FR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

    // En-tête
    signaturePage.drawText('AUTORISATION DE DROIT À L\'IMAGE', {
      x: 50, y: height - 60,
      size: 16, font: fontBold,
      color: rgb(0.1, 0.2, 0.4),
    })

    signaturePage.drawLine({
      start: { x: 50, y: height - 70 },
      end: { x: width - 50, y: height - 70 },
      thickness: 1, color: rgb(0.7, 0.7, 0.7),
    })

    // Infos de signature
    const infos = [
      { label: 'Contrat :', value: contract.name },
      { label: 'Signataire :', value: existing.signer_name },
      { label: 'Email :', value: existing.signer_email },
      { label: 'Date de signature :', value: dateStr },
      { label: 'Référence :', value: id },
    ]

    infos.forEach(({ label, value }, i) => {
      const y = height - 110 - i * 28
      signaturePage.drawText(label, {
        x: 50, y, size: 11, font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
      })
      signaturePage.drawText(value, {
        x: 180, y, size: 11, font,
        color: rgb(0.1, 0.1, 0.1),
      })
    })

    // Intègre la signature PNG
    const signatureImage = await pdfDoc.embedPng(signatureBuffer)
    const sigDims = signatureImage.scale(0.4)

    signaturePage.drawText('Signature du bénéficiaire :', {
      x: 50, y: height - 310,
      size: 11, font: fontBold,
      color: rgb(0.3, 0.3, 0.3),
    })

    signaturePage.drawImage(signatureImage, {
      x: 50, y: height - 430,
      width: sigDims.width,
      height: sigDims.height,
    })

    // Ligne de signature
    signaturePage.drawLine({
      start: { x: 50, y: height - 440 },
      end: { x: 350, y: height - 440 },
      thickness: 1, color: rgb(0.5, 0.5, 0.5),
    })

    // Mention légale
    signaturePage.drawText(
      'Document généré électroniquement – Valeur contractuelle',
      { x: 50, y: 40, size: 9, font, color: rgb(0.6, 0.6, 0.6) }
    )

    // Génère le PDF final
    const pdfBytes = await pdfDoc.save()
    const pdfBuffer = Buffer.from(pdfBytes)

    // Upload du PDF signé dans Storage
    const pdfPath = `${id}/contrat_signe_${Date.now()}.pdf`
    const { error: pdfUploadError } = await supabaseAdmin.storage
      .from('signatures')
      .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf' })

    if (pdfUploadError) throw new Error('Upload PDF: ' + pdfUploadError.message)

    // ─── 3. Met à jour la signature en base ──────────────────────────
    const { error: dbError } = await supabaseAdmin
      .from('signatures')
      .update({
        signature_path: signaturePath,
        pdf_path: pdfPath,
        status: 'signed',
        signed_at: signedAt.toISOString(),
      })
      .eq('id', id)

    if (dbError) throw new Error('DB update: ' + dbError.message)

    // ─── 4. Envoi des emails ─────────────────────────────────────────
    // ─── 4. Envoi des emails ─────────────────────────────────────────
try {
  const resend = new Resend(import.meta.env.RESEND_API_KEY)
  console.log('=== RESEND ===')
  console.log('API Key présente:', !!import.meta.env.RESEND_API_KEY)
  console.log('From:', import.meta.env.RESEND_FROM_EMAIL)
  console.log('To signataire:', existing.signer_email)

  const pdfBase64 = pdfBuffer.toString('base64')
  const fileName = `contrat_signe_${existing.signer_name.replace(/\s+/g, '_')}.pdf`

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: import.meta.env.RESEND_FROM_EMAIL,
    to: existing.signer_email,
    subject: `Votre autorisation de droit à l'image – ${contract.name}`,
    html: `<p>Bonjour ${existing.signer_name}, votre document signé est en pièce jointe.</p>`,
    attachments: [{
      filename: fileName,
      content: pdfBase64,
    }]
  })

  console.log('Email data:', emailData)
  console.log('Email error:', emailError)

} catch (emailError) {
  console.error('Erreur envoi email:', emailError)
}

    return new Response(JSON.stringify({ success: true }), { status: 200 })

  } catch (err: any) {
    console.error('Erreur PATCH signature:', err)
    return new Response(
      JSON.stringify({ error: err.message ?? 'Erreur serveur' }),
      { status: 500 }
    )
  }
}


export const DELETE: APIRoute = async ({ cookies, request, params }) => {
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

    // Récupère les chemins des fichiers avant suppression
    const { data: signature } = await supabaseAdmin
      .from('signatures')
      .select('id, photographer_id, signature_path, pdf_path, photo_path')
      .eq('id', id)
      .eq('photographer_id', user.id) // sécurité : seul le propriétaire peut supprimer
      .maybeSingle()

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Signature introuvable' }), { status: 404 })
    }

    // Supprime les fichiers dans Storage
    const filesToDelete = [
      signature.signature_path,
      signature.pdf_path,
      signature.photo_path,
    ].filter(Boolean) as string[]

    if (filesToDelete.length > 0) {
      await supabaseAdmin.storage
        .from('signatures')
        .remove(filesToDelete)
    }

    // Supprime en base
    const { error: dbError } = await supabaseAdmin
      .from('signatures')
      .delete()
      .eq('id', id)

    if (dbError) throw new Error(dbError.message)

    return new Response(JSON.stringify({ success: true }), { status: 200 })

  } catch (err: any) {
    console.error('Erreur DELETE signature:', err)
    return new Response(
      JSON.stringify({ error: err.message ?? 'Erreur serveur' }),
      { status: 500 }
    )
  }
}