import { useState, useRef, useEffect } from 'react'
import SignaturePad from 'signature_pad'
import { Button } from '@/components/ui/button'

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

  // Charge les données de la signature
  useEffect(() => {
    fetch(`/api/signatures/${signatureId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
          setStep('error')
          return
        }
        setSignerName(data.signer_name)
        setContractName(data.contract_name)
        setContractUrl(data.contract_url)
        setStep('contract')
      })
      .catch(() => {
        setError('Impossible de charger les données.')
        setStep('error')
      })
  }, [signatureId])

  // Initialise le pad de signature
  useEffect(() => {
    if (step !== 'sign' || !canvasRef.current) return

    const canvas = canvasRef.current
    const pad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
      minWidth: 1,
      maxWidth: 3,
    })
    padRef.current = pad

    // Adapte le canvas à la taille de l'écran
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

  // Soumet la signature
  async function handleSign() {
    if (!padRef.current || padRef.current.isEmpty()) {
      setError('Veuillez tracer votre signature.')
      return
    }
    if (!accepted) {
      setError('Veuillez accepter les conditions.')
      return
    }

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
      <div className="h-screen flex items-center justify-center">
        <div className="text-center text-slate-500">
          <div className="text-4xl mb-4 animate-pulse">📄</div>
          <p>Chargement…</p>
        </div>
      </div>
    )
  }
// ─── ERREUR ───
if (step === 'error') {
  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="text-center max-w-sm w-full">

        {/* Icône */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">❌</span>
        </div>

        {/* Message */}
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-slate-500 text-sm mb-8">{error}</p>

        {/* Séparateur */}
        <div className="border-t border-slate-200 pt-6">
          <p className="text-xs text-slate-400 mb-4">
            — Réservé au photographe —
          </p>

          <div className="space-y-3">
            <a href="/nouvelle-signature" className="block">
              <Button className="w-full">
                ✍️ Nouvelle signature
              </Button>
            </a>
            <a href="/dashboard" className="block">
              <Button variant="outline" className="w-full">
                Retour au dashboard
              </Button>
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}

  // ─── SUCCÈS ───
if (step === 'success') {
  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="text-center max-w-sm w-full">

        {/* Icône */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">✅</span>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold text-slate-800 mb-3">
          Signature enregistrée
        </h2>
        <p className="text-slate-600 mb-2">
          Merci <strong>{signerName}</strong>.
        </p>
        <p className="text-slate-400 text-sm mb-8">
          Le document signé vous a été envoyé par email.
        </p>

        {/* Séparateur */}
        <div className="border-t border-slate-200 pt-6 mt-2">
          <p className="text-xs text-slate-400 mb-4">
            — Réservé au photographe —
          </p>

          <div className="space-y-3">
            <a href="/nouvelle-signature" className="block">
              <Button className="w-full">
                ✍️ Nouvelle signature
              </Button>
            </a>
            <a href="/dashboard" className="block">
              <Button variant="outline" className="w-full">
                Retour au dashboard
              </Button>
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}

  // ─── LECTURE DU CONTRAT ───
  if (step === 'contract') {
    return (
      <div className="h-screen flex flex-col">

        {/* Header */}
        <div className="bg-slate-800 text-white px-4 py-3 flex items-center gap-3 shrink-0">
          <span className="text-xl">📄</span>
          <div>
            <p className="text-xs text-slate-400">Autorisation de droit à l'image</p>
            <p className="text-sm font-medium">{contractName}</p>
          </div>
        </div>

        {/* Bonjour signataire */}
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 shrink-0">
          <p className="text-sm text-blue-800">
            Bonjour <strong>{signerName}</strong>, veuillez lire attentivement le document ci-dessous avant de signer.
          </p>
        </div>

        {/* PDF iframe */}
        <div className="flex-1 overflow-hidden">
          {contractUrl ? (
            <iframe
              src={contractUrl}
              className="w-full h-full border-0"
              title="Contrat à signer"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <p>Impossible de charger le contrat.</p>
            </div>
          )}
        </div>

        {/* Bouton continuer */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0">
          <Button
            className="w-full h-12 text-base"
            onClick={() => setStep('sign')}
          >
            J'ai lu le document → Signer
          </Button>
        </div>

      </div>
    )
  }

  // ─── PAD DE SIGNATURE ───
  return (
    <div className="h-screen flex flex-col">

      {/* Header */}
      <div className="bg-slate-800 text-white px-4 py-3 shrink-0">
        <p className="text-xs text-slate-400">Étape 2 / 2</p>
        <p className="text-sm font-medium">Tracez votre signature</p>
      </div>

      {/* Infos */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 shrink-0">
        <p className="text-sm text-slate-600">
          Signataire : <strong>{signerName}</strong>
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}
        </p>
      </div>

      {/* Canvas signature */}
      <div className="flex-1 relative bg-white">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
        />
        {/* Ligne de signature */}
        <div className="absolute bottom-8 left-8 right-8 border-b-2 border-slate-300 pointer-events-none" />
        <p className="absolute bottom-3 left-8 text-xs text-slate-400 pointer-events-none">
          Signez ici
        </p>
        {/* Bouton effacer */}
        <button
          onClick={() => padRef.current?.clear()}
          className="absolute top-3 right-3 text-xs text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5"
        >
          Effacer
        </button>
      </div>

      {/* Acceptation + bouton valider */}
      <div className="p-4 border-t border-slate-200 bg-white space-y-3 shrink-0">

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={e => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-600">
            J'ai lu et j'accepte les conditions du document. Je consens à l'utilisation de mon image conformément aux termes du contrat.
          </span>
        </label>

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        <Button
          className="w-full h-12 text-base"
          onClick={handleSign}
          disabled={submitting || !accepted}
        >
          {submitting ? 'Enregistrement…' : '✅ Je valide et signe'}
        </Button>

        <button
          onClick={() => setStep('contract')}
          className="w-full text-sm text-slate-400 hover:text-slate-600 py-1"
        >
          ← Relire le contrat
        </button>

      </div>
    </div>
  )
}