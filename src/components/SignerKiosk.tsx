import { useState, useRef, useEffect } from 'react'
import SignaturePad from 'signature_pad'
import { CheckCircle, XCircle, FileText, PenLine, RotateCcw, ChevronLeft } from 'lucide-react'

interface Props {
  signatureId: string
}

type Step = 'loading' | 'otp' | 'contract' | 'sign' | 'success' | 'error'

export default function SignerKiosk({ signatureId }: Props) {
  const [step, setStep] = useState<Step>('loading')
  const [signerName, setSignerName] = useState('')
  const [contractName, setContractName] = useState('')
  const [contractUrl, setContractUrl] = useState<string | null>(null)
  const [signatureMode, setSignatureMode] = useState<'kiosque' | 'distance'>('kiosque')
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
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
        setSignatureMode(data.signature_mode ?? 'kiosque')
        if (data.signature_mode === 'distance' && !data.otp_verified) {
          setStep('otp')
        } else {
          setStep('contract')
        }
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

  async function handleVerifyOtp() {
    if (!otp.trim()) { setError('Veuillez saisir votre code.'); return }
    setOtpLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/signatures/${signatureId}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ otp: otp.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStep('contract')
    } catch (err: any) {
      setError(err.message ?? 'Erreur de vérification.')
    } finally {
      setOtpLoading(false)
    }
  }

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
      <div className="h-screen flex items-center justify-center" style={{ background: '#0F1923' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse" style={{ background: 'rgba(201,168,76,0.1)' }}>
            <FileText className="w-7 h-7" style={{ color: '#C9A84C' }} />
          </div>
          <p className="text-sm" style={{ color: 'rgba(245,240,232,0.4)' }}>Chargement…</p>
        </div>
      </div>
    )
  }

  // ─── OTP ───
  if (step === 'otp') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6" style={{ background: '#0F1923' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(201,168,76,0.1)' }}>
              <FileText className="w-7 h-7" style={{ color: '#C9A84C' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif', color: '#F5F0E8' }}>
              Vérification
            </h2>
            <p className="text-sm" style={{ color: 'rgba(245,240,232,0.5)' }}>
              Saisissez le code à 6 chiffres reçu par email pour accéder au document.
            </p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={e => { setError(null); setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)) }}
              onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
              className="w-full text-center text-3xl font-bold tracking-[0.4em] px-4 py-4 rounded-xl outline-none"
              style={{ background: '#1A2733', border: '0.5px solid rgba(201,168,76,0.3)', color: '#F5F0E8', fontFamily: 'Syne, sans-serif' }}
            />
            {error && (
              <div className="text-sm rounded-lg px-4 py-3 text-center" style={{ background: 'rgba(255,77,109,0.1)', border: '0.5px solid rgba(255,77,109,0.3)', color: '#FF4D6D' }}>
                {error}
              </div>
            )}
            <button
              onClick={handleVerifyOtp}
              disabled={otpLoading || otp.length !== 6}
              className="w-full h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
              style={{ background: '#AAFF00', color: '#0F1923', fontFamily: 'Syne, sans-serif' }}
            >
              {otpLoading ? 'Vérification…' : 'Vérifier le code'}
            </button>
          </div>
          <p className="text-xs text-center mt-4" style={{ color: 'rgba(245,240,232,0.25)' }}>
            Code valable 15 minutes · Contactez le photographe si vous n'avez pas reçu d'email.
          </p>
        </div>
      </div>
    )
  }

  // ─── ERREUR ───
  if (step === 'error') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6" style={{ background: '#0F1923' }}>
        <div className="text-center max-w-sm w-full">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(255,77,109,0.1)' }}>
            <XCircle className="w-9 h-9" style={{ color: '#FF4D6D' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif', color: '#F5F0E8' }}>Une erreur est survenue</h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(245,240,232,0.4)' }}>{error}</p>
          <div className="pt-6 space-y-3" style={{ borderTop: '0.5px solid rgba(201,168,76,0.15)' }}>
            <p className="text-xs mb-3" style={{ color: 'rgba(245,240,232,0.3)' }}>— Réservé au photographe —</p>
            <a href="/nouvelle-signature" className="block">
              <button className="w-full h-11 rounded-xl text-sm font-semibold" style={{ background: '#AAFF00', color: '#0F1923', fontFamily: 'Syne, sans-serif' }}>
                Nouvelle signature
              </button>
            </a>
            <a href="/dashboard" className="block">
              <button className="w-full h-11 rounded-xl text-sm" style={{ background: 'rgba(245,240,232,0.05)', color: 'rgba(245,240,232,0.5)', border: '0.5px solid rgba(245,240,232,0.1)' }}>
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
      <div className="h-screen flex flex-col items-center justify-center p-6" style={{ background: '#0F1923' }}>
        <div className="text-center max-w-sm w-full">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(170,255,0,0.1)' }}>
            <CheckCircle className="w-9 h-9" style={{ color: '#AAFF00' }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Syne, sans-serif', color: '#F5F0E8' }}>Signature enregistrée</h2>
          <p className="text-sm mb-2" style={{ color: 'rgba(245,240,232,0.6)' }}>
            Merci <strong style={{ color: '#C9A84C' }}>{signerName}</strong>.
          </p>
          <p className="text-xs mb-8" style={{ color: 'rgba(245,240,232,0.35)' }}>Le document signé vous a été envoyé par email.</p>
          {signatureMode === 'kiosque' && (
            <div className="pt-6 space-y-3" style={{ borderTop: '0.5px solid rgba(201,168,76,0.15)' }}>
              <p className="text-xs mb-3" style={{ color: 'rgba(245,240,232,0.3)' }}>— Réservé au photographe —</p>
              <a href="/nouvelle-signature" className="block">
                <button className="w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{ background: '#AAFF00', color: '#0F1923', fontFamily: 'Syne, sans-serif' }}>
                  <PenLine className="w-4 h-4" />
                  Nouvelle signature
                </button>
              </a>
              <a href="/dashboard" className="block">
                <button className="w-full h-11 rounded-xl text-sm" style={{ background: 'rgba(245,240,232,0.05)', color: 'rgba(245,240,232,0.5)', border: '0.5px solid rgba(245,240,232,0.1)' }}>
                  Retour au dashboard
                </button>
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── LECTURE DU CONTRAT ───
  if (step === 'contract') {
    return (
      <div className="h-screen flex flex-col" style={{ background: '#0F1923' }}>
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: '#1A2733', borderBottom: '0.5px solid rgba(201,168,76,0.2)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,168,76,0.1)' }}>
            <FileText className="w-4 h-4" style={{ color: '#C9A84C' }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs" style={{ color: 'rgba(201,168,76,0.6)' }}>Autorisation de droit à l'image</p>
            <p className="text-sm font-medium truncate" style={{ color: '#F5F0E8', fontFamily: 'Syne, sans-serif' }}>{contractName}</p>
          </div>
        </div>
        <div className="px-4 py-3 flex-shrink-0" style={{ background: 'rgba(201,168,76,0.05)', borderBottom: '0.5px solid rgba(201,168,76,0.1)' }}>
          <p className="text-sm" style={{ color: 'rgba(245,240,232,0.7)' }}>
            Bonjour <strong style={{ color: '#C9A84C' }}>{signerName}</strong>, veuillez lire le document avant de signer.
          </p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.08)', border: '0.5px solid rgba(201,168,76,0.2)' }}>
            <FileText className="w-10 h-10" style={{ color: '#C9A84C' }} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg mb-1" style={{ fontFamily: 'Syne, sans-serif', color: '#F5F0E8' }}>{contractName}</p>
            <p className="text-sm" style={{ color: 'rgba(245,240,232,0.4)' }}>Document PDF · Autorisation de droit à l'image</p>
          </div>
          {contractUrl && (
            <a href={contractUrl} target="_blank" rel="noopener noreferrer" className="w-full max-w-xs">
              <button className="w-full h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '0.5px solid rgba(201,168,76,0.3)' }}>
                <FileText className="w-4 h-4" />
                Lire le contrat
              </button>
            </a>
          )}
          <button
            onClick={() => setStep('sign')}
            className="w-full max-w-xs h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-2"
            style={{ background: '#AAFF00', color: '#0F1923', fontFamily: 'Syne, sans-serif' }}
          >
            <PenLine className="w-5 h-5" />
            J'ai lu → Signer
          </button>
          <p className="text-xs text-center max-w-xs" style={{ color: 'rgba(245,240,232,0.25)' }}>
            En signant, vous confirmez avoir lu et accepté les conditions du contrat.
          </p>
        </div>
      </div>
    )
  }

  // ─── PAD DE SIGNATURE ───
  return (
    <div className="h-screen flex flex-col" style={{ background: '#0F1923' }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: '#1A2733', borderBottom: '0.5px solid rgba(201,168,76,0.2)' }}>
        <button onClick={() => setStep('contract')} className="flex items-center gap-1 text-sm" style={{ color: 'rgba(245,240,232,0.4)' }}>
          <ChevronLeft className="w-4 h-4" />
          Relire
        </button>
        <p className="text-sm font-semibold" style={{ fontFamily: 'Syne, sans-serif', color: '#F5F0E8' }}>Signature</p>
        <button onClick={() => padRef.current?.clear()} className="flex items-center gap-1 text-sm" style={{ color: 'rgba(245,240,232,0.4)' }}>
          <RotateCcw className="w-3.5 h-3.5" />
          Effacer
        </button>
      </div>
      <div className="px-4 py-2.5 flex-shrink-0" style={{ background: 'rgba(201,168,76,0.05)', borderBottom: '0.5px solid rgba(201,168,76,0.1)' }}>
        <p className="text-sm" style={{ color: 'rgba(245,240,232,0.6)' }}>
          <strong style={{ color: '#C9A84C' }}>{signerName}</strong> · {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <div className="flex-1 relative" style={{ background: '#1A2733' }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" />
        <div className="absolute bottom-8 left-6 right-6 pointer-events-none" style={{ borderBottom: '1px solid rgba(201,168,76,0.2)' }} />
        <p className="absolute bottom-3 left-6 text-xs pointer-events-none" style={{ color: 'rgba(201,168,76,0.3)' }}>Signez ici</p>
      </div>
      <div className="p-4 space-y-3 flex-shrink-0" style={{ background: '#0F1923', borderTop: '0.5px solid rgba(201,168,76,0.15)' }}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={e => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded"
            style={{ accentColor: '#AAFF00' }}
          />
          <span className="text-sm" style={{ color: 'rgba(245,240,232,0.6)' }}>
            J'ai lu et j'accepte les conditions du contrat de droit à l'image.
          </span>
        </label>
        {error && <p className="text-sm" style={{ color: '#FF4D6D' }}>{error}</p>}
        <button
          onClick={handleSign}
          disabled={submitting || !accepted}
          className="w-full h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
          style={{ background: '#AAFF00', color: '#0F1923', fontFamily: 'Syne, sans-serif' }}
        >
          <CheckCircle className="w-5 h-5" />
          {submitting ? 'Enregistrement…' : 'Je valide et signe'}
        </button>
      </div>
    </div>
  )
}