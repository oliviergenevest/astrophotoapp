import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { Resend } from 'resend'
import sharp from 'sharp'
import { checkOrigin } from '@/lib/csrf'

// GET — récupère les données de la signature + URL signée du contrat
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

// PATCH — enregistre la signature + génère PDF + envoie emails
export const PATCH: APIRoute = async ({ request, params }) => {
  if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisée' }),
      { status: 403 }
    )
  }
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

    // Récupère la signature + contrat + infos
    const { data: existingRaw, error: findError } = await supabaseAdmin
      .from('signatures')
      .select(`
        id, status, signer_name, signer_email, signer_phone, signed_at,
        photo_path, ip_address,
        contracts(file_path, name),
        photographer_id
      `)
      .eq('id', id)
      .maybeSingle()

    const existing = existingRaw as any

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Signature introuvable' }), { status: 404 })
    }

    if (existing.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Déjà signée' }), { status: 409 })
    }

    // ─── 1. Upload de la signature PNG ───────────────────────────────
const base64Data = signature_data.replace(/^data:image\/png;base64,/, '')
const rawSignatureBuffer = Buffer.from(base64Data, 'base64')

// Compresse la signature
const signatureBuffer = await sharp(rawSignatureBuffer)
  .resize(600, 200, {
    fit: 'inside',
    withoutEnlargement: true,
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  })
  .png({ compressionLevel: 9 })
  .toBuffer()

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

    // Télécharge la photo du signataire si présente
let signerPhotoImage = null
if (existing.photo_path) {
  const { data: photoFile } = await supabaseAdmin.storage
    .from('signatures')
    .download(existing.photo_path)

  if (photoFile) {
    const photoBuffer = await photoFile.arrayBuffer()

    // Compresse et redimensionne avec sharp
    const compressedPhoto = await sharp(Buffer.from(photoBuffer))
      .resize(400, 400, {
        fit: 'inside',        // garde les proportions
        withoutEnlargement: true  // ne grossit pas si déjà petite
      })
      .jpeg({ quality: 70 }) // convertit en JPEG, qualité 70%
      .toBuffer()

    try {
      signerPhotoImage = await pdfDoc.embedJpg(compressedPhoto)
    } catch {
      signerPhotoImage = null
    }
  }
}

    // Intègre la signature PNG
    const signatureImage = await pdfDoc.embedPng(signatureBuffer)

    // Ajoute la page de signature
    const signaturePage = pdfDoc.addPage()
    const { width, height } = signaturePage.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const signedAt = new Date()
    const dateStr = signedAt.toLocaleDateString('fr-FR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

    // Récupère le nom du photographe
    const { data: photographer } = await supabaseAdmin.auth.admin
      .getUserById(existing.photographer_id)
    const photographerEmail = photographer?.user?.email ?? ''

    // ── En-tête ──────────────────────────────────────────────────────
    signaturePage.drawRectangle({
      x: 0, y: height - 80,
      width, height: 80,
      color: rgb(0.12, 0.23, 0.37),
    })

    signaturePage.drawText('AUTORISATION DE DROIT À L\'IMAGE', {
      x: 50, y: height - 45,
      size: 16, font: fontBold,
      color: rgb(1, 1, 1),
    })

    signaturePage.drawText('Document signé électroniquement', {
      x: 50, y: height - 62,
      size: 10, font,
      color: rgb(0.7, 0.8, 0.9),
    })

    // ── Champs d'information ─────────────────────────────────────────
    let yPos = height - 110

    function drawField(label: string, value: string, y: number) {
      signaturePage.drawText(label, {
        x: 50, y,
        size: 9, font: fontBold,
        color: rgb(0.5, 0.5, 0.5),
      })
      signaturePage.drawText(value, {
        x: 50, y: y - 14,
        size: 11, font,
        color: rgb(0.1, 0.1, 0.1),
      })
    }

    drawField('CONTRAT', contract.name, yPos); yPos -= 40
    drawField('PHOTOGRAPHE', photographerEmail, yPos); yPos -= 40
    drawField('SIGNATAIRE', existing.signer_name, yPos); yPos -= 40
    drawField('EMAIL', existing.signer_email, yPos); yPos -= 40
    // ← ajout téléphone conditionnel
    if (existing.signer_phone) {
      drawField('TÉLÉPHONE', existing.signer_phone, yPos); yPos -= 40
    }
    drawField('DATE DE SIGNATURE', dateStr, yPos); yPos -= 40
    drawField('ADRESSE IP', existing.ip_address ?? 'non disponible', yPos); yPos -= 40
    drawField('RÉFÉRENCE', existing.id, yPos); yPos -= 50

    // ── Ligne séparatrice ─────────────────────────────────────────────
    signaturePage.drawLine({
      start: { x: 50, y: yPos },
      end: { x: width - 50, y: yPos },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    })
    yPos -= 20

    // ── Photo + Signature côte à côte ────────────────────────────────
    const colWidth = (width - 100) / 2

    if (signerPhotoImage) {
      signaturePage.drawText('PHOTO DU SIGNATAIRE', {
        x: 50, y: yPos,
        size: 9, font: fontBold,
        color: rgb(0.5, 0.5, 0.5),
      })

      const photoDims = signerPhotoImage.scaleToFit(colWidth - 20, 120)
      signaturePage.drawImage(signerPhotoImage, {
        x: 50,
        y: yPos - 20 - photoDims.height,
        width: photoDims.width,
        height: photoDims.height,
      })
    }

    const sigX = signerPhotoImage ? 50 + colWidth + 20 : 50

    signaturePage.drawText('SIGNATURE MANUSCRITE', {
      x: sigX, y: yPos,
      size: 9, font: fontBold,
      color: rgb(0.5, 0.5, 0.5),
    })

    const sigDims = signatureImage.scaleToFit(
      signerPhotoImage ? colWidth - 20 : width - 100,
      120
    )

    signaturePage.drawImage(signatureImage, {
      x: sigX,
      y: yPos - 20 - sigDims.height,
      width: sigDims.width,
      height: sigDims.height,
    })

    signaturePage.drawLine({
      start: { x: sigX, y: yPos - 20 - sigDims.height - 5 },
      end: { x: sigX + sigDims.width, y: yPos - 20 - sigDims.height - 5 },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    })

    // ── Mention légale ────────────────────────────────────────────────
    signaturePage.drawLine({
      start: { x: 50, y: 55 },
      end: { x: width - 50, y: 55 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    })

    signaturePage.drawText(
      'Ce document a valeur contractuelle. Généré automatiquement par PhotoApp.',
      { x: 50, y: 38, size: 8, font, color: rgb(0.6, 0.6, 0.6) }
    )

    signaturePage.drawText(
      `Référence : ${existing.id}  ·  ${dateStr}`,
      { x: 50, y: 25, size: 8, font, color: rgb(0.6, 0.6, 0.6) }
    )

    // Génère le PDF final
    const pdfBytes = await pdfDoc.save({
  useObjectStreams: true,  // compression des objets PDF
  addDefaultPage: false,
})
    const pdfBuffer = Buffer.from(pdfBytes)

    // ─── 3. Upload du PDF signé ──────────────────────────────────────
    const pdfPath = `${id}/contrat_signe_${Date.now()}.pdf`
    const { error: pdfUploadError } = await supabaseAdmin.storage
      .from('signatures')
      .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf' })

    if (pdfUploadError) throw new Error('Upload PDF: ' + pdfUploadError.message)

    // ─── 4. Met à jour la signature en base ──────────────────────────
    const { error: dbError } = await supabaseAdmin
    .from('signatures')
    .update({
      contract_name: contract.name,  // ← ajout
      signature_path: signaturePath,
      pdf_path: pdfPath,
      status: 'signed',
      signed_at: signedAt.toISOString(),
    })
    .eq('id', id)
    if (dbError) throw new Error('DB update: ' + dbError.message)

    // ─── 5. Envoi des emails ─────────────────────────────────────────
    try {
      const resend = new Resend(import.meta.env.RESEND_API_KEY)
      const pdfBase64 = pdfBuffer.toString('base64')
      const fileName = `contrat_signe_${existing.signer_name.replace(/\s+/g, '_')}.pdf`

      // Email au signataire
      await resend.emails.send({
        from: import.meta.env.RESEND_FROM_EMAIL,
        to: existing.signer_email,
        subject: `Votre autorisation de droit à l'image – ${contract.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e3a5f;">Autorisation de droit à l'image</h2>
            <p>Bonjour <strong>${existing.signer_name}</strong>,</p>
            <p>Votre autorisation de droit à l'image a bien été enregistrée le <strong>${dateStr}</strong>.</p>
            <p>Vous trouverez le document signé en pièce jointe.</p>
            <p style="color: #666; font-size: 12px; margin-top: 32px;">
              Référence : ${id}<br/>
              Ce document a valeur contractuelle.
            </p>
          </div>
        `,
        attachments: [{
          filename: fileName,
          content: pdfBase64,
        }]
      })

      // Email au photographe
      if (photographerEmail) {
        await resend.emails.send({
          from: import.meta.env.RESEND_FROM_EMAIL,
          to: photographerEmail,
          subject: `Nouvelle signature – ${existing.signer_name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e3a5f;">Nouvelle signature enregistrée</h2>
              <p><strong>${existing.signer_name}</strong> (${existing.signer_email}) a signé le contrat <strong>${contract.name}</strong>.</p>
              <p>Date : ${dateStr}</p>
              <p>Le document signé est joint à cet email et archivé dans votre espace PhotoApp.</p>
              <p style="color: #666; font-size: 12px; margin-top: 32px;">
                Référence : ${id}
              </p>
            </div>
          `,
          attachments: [{
            filename: fileName,
            content: pdfBase64,
          }]
        })
      }
    } catch (emailError) {
      console.error('Erreur envoi email (non bloquant):', emailError)
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

// DELETE — supprime une signature
export const DELETE: APIRoute = async ({ cookies, request, params }) => {
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

    const { id } = params

    const supabaseAdmin = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: signature } = await supabaseAdmin
      .from('signatures')
      .select('id, photographer_id, signature_path, pdf_path, photo_path')
      .eq('id', id)
      .eq('photographer_id', user.id)
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