import { useState, useRef, useEffect } from 'react'
import SignaturePad from 'signature_pad'
import { CheckCircle, XCircle, FileText, PenLine, RotateCcw, ChevronLeft } from 'lucide-react'

interface Props {
  signatureId: string
}

type Step = 'loading' | 'contract' | 'sign' | 'success' | 'error'

export default function SignerKiosk({ signatureId }: Props) {
  const [step, setStep] = useState<Step>('loading')
  const [signerName, setSignerName] = useState('')
  const [contractName, setContractName] = useState('')
  const [contractUrl, setContractUrl] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)

  useEffect(() => {
    fetch(`/api/signatures/${signatureId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.error) { setError(data.error); setStep('error'); return }
        setSignerName(data.signer_name)
        setContractName(data.contract_name)
        setContractUrl(data.contract_url)
        setStep('contract')
      })
      .catch(() => { setError('Impossible de charger les données.'); setStep('error') })
  }, [signatureId])

  useEffect(() => {
    if (step !== 'sign' || !canvasRef.current) return
    const canvas = canvasRef.current
    const pad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(26, 39, 51)',
      penColor: '#AAFF00',
      minWidth: 1.5,
      maxWidth: 3.5,
    })
    padRef.current = pad
    function resizeCanvas() {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      canvas.getContext('2d')!.scale(ratio, ratio)
      pad.clear()
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [step])

  async function handleSign() {
    if (!padRef.current || padRef.current.isEmpty()) {
      setError('Veuillez tracer votre signature.')
      return
    }
    if (!accepted) { setError('Veuillez accepter les conditions.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const signatureData = padRef.current.toDataURL('image/png')
      const res = await fetch(`/api/signatures/${signatureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ signature_data: signatureData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStep('success')
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la signature.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── LOADING ───
  if (step === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-signa-night">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse bg-signa-gold/10">
            <FileText className="w-7 h-7 text-signa-gold" />
          </div>
          <p className="text-sm text-signa-cream/40 font-sans">
            Chargement…
          </p>
        </div>
      </div>
    )
  }

  // ─── ERREUR ───
  if (step === 'error') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-signa-night">
        <div className="text-center max-w-sm w-full">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-signa-danger/10">
            <XCircle className="w-9 h-9 text-signa-danger" />
          </div>
          <h2 className="font-syne text-xl font-bold mb-2 text-signa-cream">
            Une erreur est survenue
          </h2>
          <p className="text-sm mb-8 text-signa-cream/40">{error}</p>
          <div className="pt-6 space-y-3 border-t-[0.5px] border-signa-gold/15">
            <p className="text-xs mb-3 text-signa-cream/30">
              — Réservé au photographe —
            </p>
            <a href="/nouvelle-signature" className="block">
              <button className="font-syne w-full h-11 rounded-xl text-sm font-semibold bg-signa-lime text-signa-night">
                Nouvelle signature
              </button>
            </a>
            <a href="/dashboard" className="block">
              <button className="w-full h-11 rounded-xl text-sm bg-signa-cream/5 text-signa-cream/50 border-[0.5px] border-signa-cream/10">
                Retour au dashboard
              </button>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ─── SUCCÈS ───
  if (step === 'success') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-signa-night">
        <div className="text-center max-w-sm w-full">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-signa-lime/10">
            <CheckCircle className="w-9 h-9 text-signa-lime" />
          </div>
          <h2 className="font-syne text-2xl font-bold mb-3 text-signa-cream">
            Signature enregistrée
          </h2>
          <p className="text-sm mb-2 text-signa-cream/60">
            Merci <strong className="text-signa-gold">{signerName}</strong>.
          </p>
          <p className="text-xs mb-8 text-signa-cream/35">
            Le document signé vous a été envoyé par email.
          </p>
          <div className="pt-6 space-y-3 border-t-[0.5px] border-signa-gold/15">
            <p className="text-xs mb-3 text-signa-cream/30">
              — Réservé au photographe —
            </p>
            <a href="/nouvelle-signature" className="block">
              <button className="font-syne w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-signa-lime text-signa-night">
                <PenLine className="w-4 h-4" />
                Nouvelle signature
              </button>
            </a>
            <a href="/dashboard" className="block">
              <button className="w-full h-11 rounded-xl text-sm bg-signa-cream/5 text-signa-cream/50 border-[0.5px] border-signa-cream/10">
                Retour au dashboard
              </button>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ─── LECTURE DU CONTRAT ───
  if (step === 'contract') {
    return (
      <div className="h-screen flex flex-col bg-signa-night">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 bg-signa-night-2 border-b-[0.5px] border-signa-gold/20">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-signa-gold/10">
            <FileText className="w-4 h-4 text-signa-gold" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-signa-gold/60">Autorisation de droit à l'image</p>
            <p className="font-syne text-sm font-medium truncate text-signa-cream">
              {contractName}
            </p>
          </div>
        </div>

        {/* Message */}
        <div className="px-4 py-3 flex-shrink-0 bg-signa-gold/5 border-b-[0.5px] border-signa-gold/10">
          <p className="text-sm text-signa-cream/70">
            Bonjour <strong className="text-signa-gold">{signerName}</strong>, veuillez lire le document avant de signer.
          </p>
        </div>

        {/* Bouton lire */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-signa-gold/[0.08] border-[0.5px] border-signa-gold/20">
            <FileText className="w-10 h-10 text-signa-gold" />
          </div>

          <div className="text-center">
            <p className="font-syne font-semibold text-lg mb-1 text-signa-cream">
              {contractName}
            </p>
            <p className="text-sm text-signa-cream/40">Document PDF · Autorisation de droit à l'image</p>
          </div>

          {contractUrl && (
            <a href={contractUrl} target="_blank" rel="noopener noreferrer" className="w-full max-w-xs">
              <button className="w-full h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-signa-gold/10 text-signa-gold border-[0.5px] border-signa-gold/30">
                <FileText className="w-4 h-4" />
                Lire le contrat
              </button>
            </a>
          )}

          <button
            onClick={() => setStep('sign')}
            className="font-syne w-full max-w-xs h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-2 bg-signa-lime text-signa-night"
          >
            <PenLine className="w-5 h-5" />
            J'ai lu → Signer
          </button>

          <p className="text-xs text-center max-w-xs text-signa-cream/25">
            En signant, vous confirmez avoir lu et accepté les conditions du contrat.
          </p>
        </div>

      </div>
    )
  }

  // ─── PAD DE SIGNATURE ───
  return (
    <div className="h-screen flex flex-col bg-signa-night">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 bg-signa-night-2 border-b-[0.5px] border-signa-gold/20">
        <button
          onClick={() => setStep('contract')}
          className="flex items-center gap-1 text-sm text-signa-cream/40"
        >
          <ChevronLeft className="w-4 h-4" />
          Relire
        </button>
        <p className="font-syne text-sm font-semibold text-signa-cream">
          Signature
        </p>
        <button
          onClick={() => padRef.current?.clear()}
          className="flex items-center gap-1 text-sm text-signa-cream/40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Effacer
        </button>
      </div>

      {/* Infos signataire */}
      <div className="px-4 py-2.5 flex-shrink-0 bg-signa-gold/5 border-b-[0.5px] border-signa-gold/10">
        <p className="text-sm text-signa-cream/60">
          <strong className="text-signa-gold">{signerName}</strong> · {new Date().toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </p>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-signa-night-2">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
        />
        {/* Guide */}
        <div className="absolute bottom-8 left-6 right-6 pointer-events-none border-b border-signa-gold/20" />
        <p className="absolute bottom-3 left-6 text-xs pointer-events-none text-signa-gold/30">
          Signez ici
        </p>
      </div>

      {/* Bas */}
      <div className="p-4 space-y-3 flex-shrink-0 bg-signa-night border-t-[0.5px] border-signa-gold/15">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={e => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded accent-signa-lime"
          />
          <span className="text-sm text-signa-cream/60">
            J'ai lu et j'accepte les conditions du contrat de droit à l'image.
          </span>
        </label>

        {error && (
          <p className="text-sm text-signa-danger">{error}</p>
        )}

        <button
          onClick={handleSign}
          disabled={submitting || !accepted}
          className="font-syne w-full h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 bg-signa-lime text-signa-night"
        >
          <CheckCircle className="w-5 h-5" />
          {submitting ? 'Enregistrement…' : 'Je valide et signe'}
        </button>
      </div>

    </div>
  )
}