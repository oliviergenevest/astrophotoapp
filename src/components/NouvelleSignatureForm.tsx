import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

      const res = await fetch('/api/signatures', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Redirige vers la page de signature kiosque
      window.location.href = `/signer/${data.id}`

    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la création.')
    } finally {
      setLoading(false)
    }
  }

  // Pas de contrat actif → message d'alerte
  if (!activeContract) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="font-semibold text-amber-800 mb-2">
            Aucun contrat actif
          </h3>
          <p className="text-amber-700 text-sm mb-4">
            Vous devez activer un contrat avant de pouvoir faire signer.
          </p>
          <a href="/contrats">
            <Button variant="outline">Gérer mes contrats</Button>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">

      {/* Contrat actif */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
        <span className="text-xl">📄</span>
        <div>
          <p className="text-xs text-blue-500 font-medium">Contrat actif</p>
          <p className="text-sm font-semibold text-blue-800">{activeContract.name}</p>
        </div>
        <a href="/contrats" className="ml-auto text-xs text-blue-500 hover:underline">
          Changer
        </a>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-5">

        <h2 className="font-semibold text-slate-700">
          Informations du signataire
        </h2>

        {/* Nom */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-600">
            Nom complet <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="Jean Dupont"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            required
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-600">
            Email <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            placeholder="jean.dupont@exemple.com"
            value={signerEmail}
            onChange={e => setSignerEmail(e.target.value)}
            required
          />
          <p className="text-xs text-slate-400">
            Le PDF signé sera envoyé à cette adresse
          </p>
        </div>

        {/* Téléphone */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-600">
            Téléphone <span className="text-slate-400">(optionnel)</span>
          </label>
          <Input
            type="tel"
            placeholder="+33 6 00 00 00 00"
            value={signerPhone}
            onChange={e => setSignerPhone(e.target.value)}
          />
        </div>

        {/* Photo */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-600">
            Photo du signataire <span className="text-slate-400">(optionnel)</span>
          </label>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4 file:rounded-lg
              file:border-0 file:text-sm file:font-medium
              file:bg-slate-100 file:text-slate-700
              hover:file:bg-slate-200 cursor-pointer"
          />
          <p className="text-xs text-slate-400">
            Sera intégrée dans le PDF signé
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="pt-2 space-y-3">
          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={loading}
          >
            {loading ? 'Création en cours…' : '✍️ Passer à la signature'}
          </Button>

          <a href="/dashboard">
            <Button type="button" variant="ghost" className="w-full">
              Annuler
            </Button>
          </a>
        </div>

      </form>
    </div>
  )
}