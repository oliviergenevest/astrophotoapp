import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Signature {
  id: string
  signer_name: string
  signer_email: string
  signed_at: string
  status: string
  signed_url: string | null
}

interface Props {
  signatures: Signature[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function SignaturesList({ signatures: initial }: Props) {
  const [signatures, setSignatures] = useState<Signature[]>(initial)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(sig: Signature) {
    if (!confirm(`Supprimer la signature de "${sig.signer_name}" ?`)) return
    setError(null)
    setDeletingId(sig.id)

    try {
      const res = await fetch(`/api/signatures/${sig.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSignatures(prev => prev.filter(s => s.id !== sig.id))

    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la suppression.')
    } finally {
      setDeletingId(null)
    }
  }

  if (signatures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="text-5xl mb-4">🖊️</div>
        <h3 className="font-medium text-slate-700 mb-1">
          Aucune signature pour l'instant
        </h3>
        <p className="text-slate-400 text-sm">
          Vos signatures apparaîtront ici après la première session
        </p>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      <ul className="divide-y divide-slate-100">
        {signatures.map((sig) => (
          <li key={sig.id} className="px-6 py-4 flex items-center justify-between gap-4">

            {/* Infos signataire */}
            <div className="min-w-0">
              <p className="font-medium text-slate-800 truncate">{sig.signer_name}</p>
              <p className="text-sm text-slate-400 truncate">{sig.signer_email}</p>
              <p className="text-xs text-slate-400 mt-0.5">{formatDate(sig.signed_at)}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={sig.status === 'signed' ? 'default' : 'secondary'}>
                {sig.status === 'signed' ? 'Signé' : 'En attente'}
              </Badge>

              {sig.signed_url && (
                <a
                  href={sig.signed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline px-1"
                >
                  PDF
                </a>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(sig)}
                disabled={deletingId === sig.id}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                {deletingId === sig.id ? '…' : 'Supprimer'}
              </Button>
            </div>

          </li>
        ))}
      </ul>
    </div>
  )
}