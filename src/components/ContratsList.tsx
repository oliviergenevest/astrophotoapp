import { useState, useRef } from 'react'
import { Upload, FileText, Eye, Pencil, Trash2, Check, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import ConfirmModal from '@/components/ui/ConfirmModal'
import EditContractModal from '@/components/EditContractModal'

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
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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
      const res = await fetch('/api/contracts', { method: 'POST', body: formData, credentials: 'include' })
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

  async function handleActivate(id: string) {
    setError(null)
    const res = await fetch(`/api/contracts/${id}`, { method: 'PATCH', credentials: 'include' })
    const data = await res.json()
    if (!res.ok) return setError(data.error)
    setContracts(prev => prev.map(c => ({ ...c, is_active: c.id === id })))
  }

  async function handleDelete(contract: Contract) {
    const res = await fetch(`/api/contracts/${contract.id}`, { method: 'DELETE', credentials: 'include' })
    const data = await res.json()
    if (!res.ok) return setError(data.error)
    setContracts(prev => prev.filter(c => c.id !== contract.id))
    setSuccess('Contrat supprimé.')
  }

  function handleSaved(updated: Contract) {
    setContracts(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* Zone d'upload */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: '#1A2733', border: '0.5px solid rgba(201,168,76,0.15)' }}
      >
        <h3
          className="font-semibold text-sm"
          style={{ fontFamily: 'Syne, sans-serif', color: '#F5F0E8' }}
        >
          Ajouter un contrat
        </h3>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: '#C9A84C' }}>
              Nom du contrat
            </label>
            <input
              placeholder="Ex : Contrat commercial 2024"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: '#0F1923',
                border: '0.5px solid rgba(201,168,76,0.2)',
                color: '#F5F0E8',
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: '#C9A84C' }}>
              Fichier PDF
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="block w-full text-sm cursor-pointer
                file:mr-4 file:py-2 file:px-4 file:rounded-lg
                file:border-0 file:text-xs file:font-medium"
              style={{ color: 'rgba(245,240,232,0.4)' }}
            />
            <p className="text-xs" style={{ color: 'rgba(245,240,232,0.3)' }}>
              PDF uniquement · 10 Mo max · Stockage privé
            </p>
          </div>
        </div>

        {error && (
          <div className="text-sm rounded-lg px-4 py-3" style={{ background: 'rgba(255,77,109,0.1)', border: '0.5px solid rgba(255,77,109,0.3)', color: '#FF4D6D' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm rounded-lg px-4 py-3" style={{ background: 'rgba(170,255,0,0.1)', border: '0.5px solid rgba(170,255,0,0.3)', color: '#AAFF00' }}>
            {success}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ background: '#AAFF00', color: '#0F1923' }}
        >
          {uploading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Upload className="w-4 h-4" />
          }
          {uploading ? 'Upload en cours…' : 'Uploader le contrat'}
        </button>
      </div>

      {/* Liste */}
      <div>
        <h3
          className="text-sm font-semibold mb-3"
          style={{ fontFamily: 'Syne, sans-serif', color: '#F5F0E8' }}
        >
          Mes contrats ({contracts.length})
        </h3>

        {contracts.length === 0 ? (
          <div className="text-center py-12">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(201,168,76,0.1)' }}
            >
              <FileText className="w-6 h-6" style={{ color: '#C9A84C' }} />
            </div>
            <p className="text-sm" style={{ color: 'rgba(245,240,232,0.4)' }}>Aucun contrat pour l'instant</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(245,240,232,0.25)' }}>Uploadez votre premier contrat ci-dessus</p>
          </div>
        ) : (
          <ul
            className="rounded-xl overflow-hidden"
            style={{ border: '0.5px solid rgba(201,168,76,0.15)' }}
          >
            {contracts.map((contract, i) => (
              <li
                key={contract.id}
                className="px-4 py-4 flex items-center justify-between gap-4"
                style={{
                  background: contract.is_active ? 'rgba(201,168,76,0.06)' : '#1A2733',
                  borderBottom: i < contracts.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                }}
              >
                {/* Infos */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: contract.is_active ? 'rgba(201,168,76,0.15)' : 'rgba(245,240,232,0.05)' }}
                  >
                    <FileText className="w-4 h-4" style={{ color: contract.is_active ? '#C9A84C' : 'rgba(245,240,232,0.4)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#F5F0E8' }}>
                      {contract.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs" style={{ color: 'rgba(245,240,232,0.3)' }}>
                        {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                      </p>
                      {contract.is_active && (
                        <span className="text-xs font-medium" style={{ color: '#AAFF00' }}>● actif</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {contract.signed_url && (
                    <a
                      href={contract.signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs transition-opacity hover:opacity-100"
                      style={{ color: 'rgba(245,240,232,0.4)' }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Voir
                    </a>
                  )}

                  <button
                    onClick={() => setEditingContract(contract)}
                    className="flex items-center gap-1 text-xs transition-opacity hover:opacity-100"
                    style={{ color: 'rgba(245,240,232,0.4)' }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Modifier
                  </button>

                  {!contract.is_active && (
                    <button
                      onClick={() => handleActivate(contract.id)}
                      className="flex items-center gap-1 text-xs transition-opacity hover:opacity-100"
                      style={{ color: '#AAFF00' }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Activer
                    </button>
                  )}

                  <button
                    onClick={() => setContractToDelete(contract)}
                    className="flex items-center gap-1 text-xs transition-opacity hover:opacity-100"
                    style={{ color: '#FF4D6D' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                </div>

              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modales */}
      {contractToDelete && (
        <ConfirmModal
          title="Supprimer ce contrat ?"
          message={`Le contrat "${contractToDelete.name}" sera définitivement supprimé.`}
          onConfirm={() => handleDelete(contractToDelete)}
          onClose={() => setContractToDelete(null)}
        />
      )}

      {editingContract && (
        <EditContractModal
          contract={editingContract}
          onClose={() => setEditingContract(null)}
          onSave={handleSaved}
        />
      )}

    </div>
  )
}