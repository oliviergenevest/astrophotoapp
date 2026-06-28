import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface Signature {
  id: string
  signer_name: string
  signer_email: string
  signer_phone: string | null  // ← ajout
  signed_at: string
  status: string
  signed_url: string | null
  contract_name: string | null
  contracts: { name: string }[] | null
  pdf_path: string | null
}

interface ApiResponse {
  signatures: Signature[]
  total: number
  page: number
  perPage: number
  totalPages: number
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

export default function SignaturesList() {
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [signatureToDelete, setSignatureToDelete] = useState<Signature | null>(null)

  // Charge les signatures
  const fetchSignatures = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(search ? { search } : {})
      })

      const res = await fetch(`/api/signatures?${params}`, {
        credentials: 'include'
      })

      const data: ApiResponse = await res.json()
      if (!res.ok) throw new Error(data as any)

      setSignatures(data.signatures)
      setTotal(data.total)
      setTotalPages(data.totalPages)

    } catch (err: any) {
      setError(err.message ?? 'Erreur lors du chargement.')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchSignatures()
  }, [fetchSignatures])

  // Recherche avec délai (debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Ouvre le PDF
  async function handleOpenPdf(id: string) {
    setLoadingPdfId(id)
    try {
      const res = await fetch(`/api/signatures/${id}/pdf`, {
        credentials: 'include'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.open(data.url, '_blank')
    } catch (err: any) {
      setError(err.message ?? 'Impossible d\'ouvrir le PDF.')
    } finally {
      setLoadingPdfId(null)
    }
  }

  // Supprime une signature
  async function handleDelete(sig: Signature) {
    setDeletingId(sig.id)
    try {
      const res = await fetch(`/api/signatures/${sig.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Recharge la page courante
      fetchSignatures()

    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la suppression.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>

      {/* Barre de recherche */}
      <div className="px-6 py-3 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher par nom ou email…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      )}

      {/* Liste vide */}
      {!loading && signatures.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="text-5xl mb-4">🖊️</div>
          <h3 className="font-medium text-slate-700 mb-1">
            {search ? 'Aucun résultat' : 'Aucune signature pour l\'instant'}
          </h3>
          <p className="text-slate-400 text-sm">
            {search
              ? `Aucune signature ne correspond à "${search}"`
              : 'Vos signatures apparaîtront ici'
            }
          </p>
        </div>
      )}

      {/* Liste */}
      {!loading && signatures.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {signatures.map((sig) => (
            <li key={sig.id} className="px-6 py-4 flex items-center justify-between gap-4">

              {/* Infos signataire */}
              <div className="min-w-0">
                <p className="font-medium text-slate-800 truncate">{sig.signer_name}</p>
                <p className="text-sm text-slate-400 truncate">✉ {sig.signer_email}</p>
                 {sig.signer_phone && (
                  <p className="text-sm text-slate-400 truncate">📞 {sig.signer_phone}</p>
                )}
                {(sig.contract_name ?? sig.contracts?.[0]?.name) && (
                  <p className="text-xs text-blue-500 truncate mt-0.5">
                    📄 {sig.contract_name ?? sig.contracts?.[0]?.name}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(sig.signed_at)}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Badge variant={sig.status === 'signed' ? 'default' : 'secondary'}>
                  {sig.status === 'signed' ? 'Signé' : 'En attente'}
                </Badge>

                {sig.status === 'signed' && (
                  <button
                    onClick={() => handleOpenPdf(sig.id)}
                    disabled={loadingPdfId === sig.id}
                    className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {loadingPdfId === sig.id ? '…' : '📄 Voir le PDF'}
                  </button>
                )}

                <button
                  onClick={() => setSignatureToDelete(sig)}
                  disabled={deletingId === sig.id}
                  className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {deletingId === sig.id ? '…' : 'Supprimer'}
                </button>
              </div>

            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">

          <p className="text-sm text-slate-400">
            {total} signature{total > 1 ? 's' : ''}
            {search && ` pour "${search}"`}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>

            <span className="text-sm text-slate-600 min-w-[80px] text-center">
              Page {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

        </div>
      )}

      {/* Total sans pagination */}
      {!loading && totalPages === 1 && total > 0 && (
        <div className="px-6 py-3 border-t border-slate-100">
          <p className="text-sm text-slate-400">
            {total} signature{total > 1 ? 's' : ''}
            {search && ` pour "${search}"`}
          </p>
        </div>
      )}

      {/* Modale de confirmation */}
      {signatureToDelete && (
        <ConfirmModal
          title="Supprimer cette signature ?"
          message={`La signature de "${signatureToDelete.signer_name}" et tous ses fichiers associés seront définitivement supprimés.`}
          onConfirm={() => handleDelete(signatureToDelete)}
          onClose={() => setSignatureToDelete(null)}
        />
      )}

    </div>
  )
}