import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Contract {
  id: string
  name: string
  file_path: string
  is_active: boolean
  created_at: string
  signed_url: string | null
}

interface Props {
  contract: Contract
  onClose: () => void
  onSave: (updated: Contract) => void
}

export default function EditContractModal({ contract, onClose, onSave }: Props) {
  const [name, setName] = useState(contract.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    setError(null)
    if (!name.trim()) return setError('Le nom est obligatoire.')
    setSaving(true)

    try {
      const formData = new FormData()
      formData.append('name', name.trim())

      const file = fileRef.current?.files?.[0]
      if (file) formData.append('file', file)

      const res = await fetch(`/api/contracts/${contract.id}/edit`, {
        method: 'PATCH',
        body: formData,
        credentials: 'include',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      onSave(data)
      onClose()

    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la modification.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Modale */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto space-y-5">

        <div>
          <h3 className="text-lg font-semibold text-slate-800">Modifier le contrat</h3>
          <p className="text-sm text-slate-400 mt-0.5">Modifiez le nom et/ou le PDF associé</p>
        </div>

        {/* Nom */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-600">Nom du contrat</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex : Contrat commercial 2024"
          />
        </div>

        {/* Nouveau PDF */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-600">
            Nouveau PDF <span className="text-slate-400">(optionnel)</span>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4 file:rounded-lg
              file:border-0 file:text-sm file:font-medium
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100 cursor-pointer"
          />
          <p className="text-xs text-slate-400">
            Laisser vide pour conserver le PDF actuel
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Boutons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>

      </div>
    </>
  )
}