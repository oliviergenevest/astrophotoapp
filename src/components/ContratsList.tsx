import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Contract {
  id: string
  name: string
  file_path: string
  is_active: boolean
  created_at: string
  signed_url: string | null
}

interface Props {
  contracts: Contract[]
  userId: string
}

export default function ContratsList({ contracts: initial, userId }: Props) {
  const [contracts, setContracts] = useState<Contract[]>(initial)
  const [uploading, setUploading] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ─── Upload ───
  async function handleUpload() {
    setError(null)
    setSuccess(null)

    const file = fileRef.current?.files?.[0]
    if (!file) return setError('Sélectionnez un fichier PDF.')
    if (!newName.trim()) return setError('Donnez un nom à ce contrat.')
    if (file.type !== 'application/pdf') return setError('Le fichier doit être un PDF.')
    if (file.size > 10 * 1024 * 1024) return setError('Fichier trop lourd (10 Mo max).')

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', newName.trim())

      const res = await fetch('/api/contracts', {
        method: 'POST',
        body: formData,
        credentials: 'include' 
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setContracts(prev => [data, ...prev])
      setNewName('')
      if (fileRef.current) fileRef.current.value = ''
      setSuccess('Contrat uploadé avec succès !')

    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de l\'upload.')
    } finally {
      setUploading(false)
    }
  }

  // ─── Activer ───
  async function handleActivate(id: string) {
    setError(null)

    const res = await fetch(`/api/contracts/${id}`, { method: 'PATCH', credentials: 'include'  })
    const data = await res.json()

    if (!res.ok) return setError(data.error)

    setContracts(prev => prev.map(c => ({ ...c, is_active: c.id === id })))
  }

  // ─── Supprimer ───
  async function handleDelete(contract: Contract) {
    if (!confirm(`Supprimer "${contract.name}" ?`)) return
    setError(null)

    const res = await fetch(`/api/contracts/${contract.id}`, { method: 'DELETE', credentials: 'include' })
    const data = await res.json()

    if (!res.ok) return setError(data.error)

    setContracts(prev => prev.filter(c => c.id !== contract.id))
    setSuccess('Contrat supprimé.')
  }

  return (
    <div className="p-6 space-y-6">

      {/* Zone d'upload */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="font-semibold text-slate-700">Ajouter un contrat</h3>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600">Nom du contrat</label>
            <Input
              placeholder="Ex : Contrat commercial 2024"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600">Fichier PDF</label>
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
            <p className="text-xs text-slate-400">PDF uniquement · 10 Mo max · Stockage privé</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
            {success}
          </div>
        )}

        <Button onClick={handleUpload} disabled={uploading} className="w-full">
          {uploading ? 'Upload en cours…' : 'Uploader le contrat'}
        </Button>
      </div>

      {/* Liste */}
      <div>
        <h3 className="font-semibold text-slate-700 mb-3">
          Mes contrats ({contracts.length})
        </h3>

        {contracts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-3">📄</div>
            <p>Aucun contrat pour l'instant</p>
            <p className="text-sm mt-1">Uploadez votre premier contrat ci-dessus</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {contracts.map(contract => (
              <li
                key={contract.id}
                className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition-colors
                  ${contract.is_active
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200 bg-white'
                  }`}
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{contract.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {contract.is_active && <Badge className="shrink-0">Actif</Badge>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {contract.signed_url && (
                   <a 
                      href={contract.signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline px-2"
                    >
                      Voir
                    </a>
                  )}
                  {!contract.is_active && (
                    <Button size="sm" variant="outline" onClick={() => handleActivate(contract.id)}>
                      Activer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(contract)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    Supprimer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}