import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileUp, AlertCircle } from 'lucide-react'

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
  const [fileName, setFileName] = useState<string | null>(null)
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
        className="fixed inset-0 z-40 bg-signa-night/80"
        onClick={onClose}
      />

      {/* Modale */}
      <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 overflow-hidden rounded-2xl border-[0.5px] border-signa-neutral bg-signa-night-2">

        <div className="px-6 pt-6">
          <h3 className="font-syne text-[17px] font-bold leading-tight text-signa-cream">
            Modifier le contrat
          </h3>
          <p className="mt-[3px] text-[13px] text-signa-cream/60">
            Modifiez le nom et/ou le PDF associé
          </p>
        </div>

        <div className="flex flex-col gap-[1.1rem] px-6 pt-5">
          {/* Nom */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-signa-cream/80">
              Nom du contrat
            </label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex : Contrat commercial 2024"
              className={`bg-signa-night border-signa-neutral text-signa-cream placeholder:text-slate-500 focus-visible:ring-signa-gold ${
                error ? 'border-signa-danger' : ''
              }`}
            />
          </div>

          {/* Nouveau PDF */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-signa-cream/80">
              Nouveau PDF <span className="font-normal text-slate-500">(optionnel)</span>
            </label>

            <label
              htmlFor="contract-file-input"
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-signa-neutral p-4 transition-colors hover:border-signa-gold hover:bg-signa-gold/5"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-signa-gold/15 text-signa-gold">
                <FileUp className="h-[18px] w-[18px]" />
              </div>
              <div>
                <div className="text-[13px] text-signa-cream/80">
                  {fileName ?? 'Cliquer pour choisir un fichier'}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">PDF uniquement</div>
              </div>
            </label>
            <input
              id="contract-file-input"
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={e => setFileName(e.target.files?.[0]?.name ?? null)}
            />

            <p className="mt-1.5 text-xs text-slate-500">
              Laisser vide pour conserver le PDF actuel
            </p>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-[1.1rem] flex items-center gap-2 rounded-lg border-[0.5px] border-signa-danger/40 bg-signa-danger/10 px-3.5 py-2.5 text-[13px] text-signa-danger">
            <AlertCircle className="h-[15px] w-[15px] flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Boutons */}
        <div className="flex gap-2.5 px-6 py-6">
          <Button
            variant="outline"
            className="flex-1 border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            onClick={onClose}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            className="flex-1 border border-signa-gold bg-white text-[#8A6D1F] hover:bg-signa-gold/10 disabled:opacity-60"
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