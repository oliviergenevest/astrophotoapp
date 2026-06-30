import { useState, useRef } from 'react'
import { User, Mail, Phone, Camera, FileText, PenLine } from 'lucide-react'

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
      const photo = photoRef.current?.files?.[0]
      if (photo) formData.append('photo', photo)
      const res = await fetch('/api/signatures', { method: 'POST', body: formData, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = `/signer/${data.id}`
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la création.')
    } finally {
      setLoading(false)
    }
  }

  if (!activeContract) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-xl p-6 text-center bg-signa-warning/[0.08] border-[0.5px] border-signa-warning/20">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-signa-warning/[0.12]">
            <FileText className="w-6 h-6 text-signa-warning" />
          </div>
          <h3 className="font-syne font-semibold mb-2 text-signa-warning">
            Aucun contrat actif
          </h3>
          <p className="text-sm mb-4 text-signa-warning/70">
            Activez un contrat avant de faire signer.
          </p>
          <a href="/contrats">
            <button className="px-4 py-2 rounded-lg text-sm font-medium bg-signa-warning/15 text-signa-warning border-[0.5px] border-signa-warning/30">
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
      <div className="rounded-xl px-4 py-3 mb-6 flex items-center gap-3 bg-signa-gold/[0.08] border-[0.5px] border-signa-gold/20">
        <FileText className="w-4 h-4 flex-shrink-0 text-signa-gold" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-signa-gold/70">Contrat actif</p>
          <p className="font-syne text-sm font-medium truncate text-signa-gold">
            {activeContract.name}
          </p>
        </div>
        <a href="/contrats" className="text-xs flex-shrink-0 text-signa-gold/50">
          Changer
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        <h2 className="font-syne text-sm font-semibold text-signa-cream">
          Informations du signataire
        </h2>

        {/* Nom */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-signa-gold">
            <User className="w-3.5 h-3.5" />
            Nom complet <span className="text-signa-danger">*</span>
          </label>
          <input
            placeholder="Jean Dupont"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none bg-signa-night-2 border-[0.5px] border-signa-gold/20 text-signa-cream"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-signa-gold">
            <Mail className="w-3.5 h-3.5" />
            Email <span className="text-signa-danger">*</span>
          </label>
          <input
            type="email"
            placeholder="jean.dupont@exemple.com"
            value={signerEmail}
            onChange={e => setSignerEmail(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none bg-signa-night-2 border-[0.5px] border-signa-gold/20 text-signa-cream"
          />
          <p className="text-xs text-signa-cream/30">
            Le PDF signé sera envoyé à cette adresse
          </p>
        </div>

        {/* Téléphone */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-signa-gold">
            <Phone className="w-3.5 h-3.5" />
            Téléphone <span className="text-signa-cream/30">(optionnel)</span>
          </label>
          <input
            type="tel"
            placeholder="+33 6 00 00 00 00"
            value={signerPhone}
            onChange={e => setSignerPhone(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none bg-signa-night-2 border-[0.5px] border-signa-gold/20 text-signa-cream"
          />
        </div>

        {/* Photo */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-signa-gold">
            <Camera className="w-3.5 h-3.5" />
            Photo du signataire <span className="text-signa-cream/30">(optionnel)</span>
          </label>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="block w-full text-xs cursor-pointer text-signa-cream/40"
          />
          <p className="text-xs text-signa-cream/30">
            Sera intégrée dans le PDF signé
          </p>
        </div>

        {error && (
          <div className="text-sm rounded-lg px-4 py-3 bg-signa-danger/10 border-[0.5px] border-signa-danger/30 text-signa-danger">
            {error}
          </div>
        )}

        <div className="pt-2 space-y-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-base font-semibold font-syne transition-opacity disabled:opacity-50 bg-signa-lime text-signa-night"
          >
            <PenLine className="w-5 h-5" />
            {loading ? 'Création en cours…' : 'Passer à la signature'}
          </button>

          <a href="/dashboard" className="block">
            <button
              type="button"
              className="w-full h-10 rounded-xl text-sm transition-opacity bg-transparent text-signa-cream/35 border-[0.5px] border-signa-cream/10"
            >
              Annuler
            </button>
          </a>
        </div>

      </form>
    </div>
  )
}