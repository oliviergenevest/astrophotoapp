import { useState, useRef } from 'react'
import { User, Mail, Phone, Camera, FileText, PenLine, Wifi, WifiOff } from 'lucide-react'

interface Contract {
  id: string
  name: string
}

interface Props {
  activeContract: Contract | null
}

export default function NouvelleSignatureForm({ activeContract }: Props) {
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [signerPhone, setSignerPhone] = useState('')
  const [signatureMode, setSignatureMode] = useState<'kiosque' | 'distance'>('kiosque')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('signer_name', signerName)
      formData.append('signer_email', signerEmail)
      formData.append('signer_phone', signerPhone)
      formData.append('signature_mode', signatureMode)
      const photo = photoRef.current?.files?.[0]
      if (photo) formData.append('photo', photo)
      const res = await fetch('/api/signatures', { method: 'POST', body: formData, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (signatureMode === 'distance') {
        window.location.href = `/confirmation-envoi?name=${encodeURIComponent(signerName)}&email=${encodeURIComponent(signerEmail)}`
      } else {
        window.location.href = `/signer/${data.id}`
      }
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la création.')
    } finally {
      setLoading(false)
    }
  }

  if (!activeContract) {
    return (
      <div className="p-4 sm:p-6">
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: 'rgba(255,184,48,0.08)', border: '0.5px solid rgba(255,184,48,0.2)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,184,48,0.12)' }}
          >
            <FileText className="w-6 h-6" style={{ color: '#FFB830' }} />
          </div>
          <h3 className="font-semibold mb-2" style={{ fontFamily: 'Syne, sans-serif', color: '#FFB830' }}>
            Aucun contrat actif
          </h3>
          <p className="text-sm mb-4" style={{ color: 'rgba(255,184,48,0.7)' }}>
            Activez un contrat avant de faire signer.
          </p>
          <a href="/contrats">
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'rgba(255,184,48,0.15)', color: '#FFB830', border: '0.5px solid rgba(255,184,48,0.3)' }}
            >
              Gérer mes contrats
            </button>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">

      {/* Contrat actif */}
      <div
        className="rounded-xl px-4 py-3 mb-6 flex items-center gap-3"
        style={{ background: 'rgba(201,168,76,0.08)', border: '0.5px solid rgba(201,168,76,0.2)' }}
      >
        <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#C9A84C' }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs" style={{ color: 'rgba(201,168,76,0.7)' }}>Contrat actif</p>
          <p className="text-sm font-medium truncate" style={{ color: '#C9A84C', fontFamily: 'Syne, sans-serif' }}>
            {activeContract.name}
          </p>
        </div>
        <a href="/contrats" className="text-xs flex-shrink-0" style={{ color: 'rgba(201,168,76,0.5)' }}>
          Changer
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Choix du mode */}
        <div className="space-y-2">
          <p className="text-xs font-medium" style={{ color: '#C9A84C' }}>Mode de signature</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSignatureMode('kiosque')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl text-left transition-all"
              style={{
                background: signatureMode === 'kiosque' ? 'rgba(170,255,0,0.1)' : '#1A2733',
                border: signatureMode === 'kiosque' ? '1.5px solid #AAFF00' : '0.5px solid rgba(245,240,232,0.1)',
              }}
            >
              <Wifi className="w-5 h-5" style={{ color: signatureMode === 'kiosque' ? '#AAFF00' : 'rgba(245,240,232,0.4)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: signatureMode === 'kiosque' ? '#AAFF00' : '#F5F0E8', fontFamily: 'Syne, sans-serif' }}>
                  Sur place
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(245,240,232,0.4)' }}>
                  Le signataire signe sur votre téléphone
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSignatureMode('distance')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl text-left transition-all"
              style={{
                background: signatureMode === 'distance' ? 'rgba(201,168,76,0.1)' : '#1A2733',
                border: signatureMode === 'distance' ? '1.5px solid #C9A84C' : '0.5px solid rgba(245,240,232,0.1)',
              }}
            >
              <WifiOff className="w-5 h-5" style={{ color: signatureMode === 'distance' ? '#C9A84C' : 'rgba(245,240,232,0.4)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: signatureMode === 'distance' ? '#C9A84C' : '#F5F0E8', fontFamily: 'Syne, sans-serif' }}>
                  À distance
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(245,240,232,0.4)' }}>
                  Un lien est envoyé par email
                </p>
              </div>
            </button>
          </div>
        </div>

        <h2 className="text-sm font-semibold" style={{ fontFamily: 'Syne, sans-serif', color: '#F5F0E8' }}>
          Informations du signataire
        </h2>

        {/* Nom */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#C9A84C' }}>
            <User className="w-3.5 h-3.5" />
            Nom complet <span style={{ color: '#FF4D6D' }}>*</span>
          </label>
          <input
            placeholder="Jean Dupont"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: '#1A2733', border: '0.5px solid rgba(201,168,76,0.2)', color: '#F5F0E8' }}
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#C9A84C' }}>
            <Mail className="w-3.5 h-3.5" />
            Email <span style={{ color: '#FF4D6D' }}>*</span>
          </label>
          <input
            type="email"
            placeholder="jean.dupont@exemple.com"
            value={signerEmail}
            onChange={e => setSignerEmail(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: '#1A2733', border: '0.5px solid rgba(201,168,76,0.2)', color: '#F5F0E8' }}
          />
          <p className="text-xs" style={{ color: 'rgba(245,240,232,0.3)' }}>
            {signatureMode === 'distance'
              ? 'Le lien de signature et le code OTP seront envoyés à cette adresse'
              : 'Le PDF signé sera envoyé à cette adresse'
            }
          </p>
        </div>

        {/* Téléphone */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#C9A84C' }}>
            <Phone className="w-3.5 h-3.5" />
            Téléphone <span style={{ color: 'rgba(245,240,232,0.3)' }}>(optionnel)</span>
          </label>
          <input
            type="tel"
            placeholder="+33 6 00 00 00 00"
            value={signerPhone}
            onChange={e => setSignerPhone(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: '#1A2733', border: '0.5px solid rgba(201,168,76,0.2)', color: '#F5F0E8' }}
          />
        </div>

        {/* Photo — uniquement en mode kiosque */}
        {signatureMode === 'kiosque' && (
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#C9A84C' }}>
              <Camera className="w-3.5 h-3.5" />
              Photo du signataire <span style={{ color: 'rgba(245,240,232,0.3)' }}>(optionnel)</span>
            </label>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="block w-full text-xs cursor-pointer"
              style={{ color: 'rgba(245,240,232,0.4)' }}
            />
            <p className="text-xs" style={{ color: 'rgba(245,240,232,0.3)' }}>
              Sera intégrée dans le PDF signé
            </p>
          </div>
        )}

        {error && (
          <div
            className="text-sm rounded-lg px-4 py-3"
            style={{ background: 'rgba(255,77,109,0.1)', border: '0.5px solid rgba(255,77,109,0.3)', color: '#FF4D6D' }}
          >
            {error}
          </div>
        )}

        <div className="pt-2 space-y-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-base font-semibold transition-opacity disabled:opacity-50"
            style={{ background: '#AAFF00', color: '#0F1923', fontFamily: 'Syne, sans-serif' }}
          >
            <PenLine className="w-5 h-5" />
            {loading
              ? 'Envoi en cours…'
              : signatureMode === 'distance'
                ? 'Envoyer le lien de signature'
                : 'Passer à la signature'
            }
          </button>

          <a href="/dashboard" className="block">
            <button
              type="button"
              className="w-full h-10 rounded-xl text-sm transition-opacity"
              style={{ background: 'transparent', color: 'rgba(245,240,232,0.35)', border: '0.5px solid rgba(245,240,232,0.1)' }}
            >
              Annuler
            </button>
          </a>
        </div>

      </form>
    </div>
  )
}