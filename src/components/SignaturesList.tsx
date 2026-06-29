import { useState, useEffect, useCallback } from 'react'
import {
  Search, Eye, Trash2, Mail, Phone, FileText,
  CheckCircle, Clock, ChevronDown, ChevronUp, Loader2
} from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface Signature {
  id: string
  signer_name: string
  signer_email: string
  signer_phone: string | null
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
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  { bg: 'rgba(170,255,0,0.12)', color: '#AAFF00' },
  { bg: 'rgba(201,168,76,0.12)', color: '#C9A84C' },
  { bg: 'rgba(255,184,48,0.12)', color: '#FFB830' },
  { bg: 'rgba(245,240,232,0.08)', color: '#F5F0E8' },
]

function getAvatarColor(name: string) {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
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
  const [openId, setOpenId] = useState<string | null>(null)

  const fetchSignatures = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(search ? { search } : {})
      })
      const res = await fetch(`/api/signatures?${params}`, { credentials: 'include' })
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

  useEffect(() => { fetchSignatures() }, [fetchSignatures])

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  async function handleOpenPdf(id: string) {
    setLoadingPdfId(id)
    try {
      const res = await fetch(`/api/signatures/${id}/pdf`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.open(data.url, '_blank')
    } catch (err: any) {
      setError(err.message ?? 'Impossible d\'ouvrir le PDF.')
    } finally {
      setLoadingPdfId(null)
    }
  }

  async function handleDelete(sig: Signature) {
    setDeletingId(sig.id)
    try {
      const res = await fetch(`/api/signatures/${sig.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      fetchSignatures()
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la suppression.')
    } finally {
      setDeletingId(null)
    }
  }

  function toggleOpen(id: string) {
    setOpenId(prev => prev === id ? null : id)
  }

  return (
    <div>

      {/* Barre de recherche */}
      <div className="px-4 sm:px-6 py-3" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#C9A84C' }} />
          <input
            placeholder="Rechercher par nom ou email…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{
              background: '#0F1923',
              border: '0.5px solid rgba(201,168,76,0.2)',
              color: '#F5F0E8',
            }}
          />
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mx-4 sm:mx-6 mt-4 text-sm rounded-lg px-4 py-3" style={{ background: 'rgba(255,77,109,0.1)', border: '0.5px solid rgba(255,77,109,0.3)', color: '#FF4D6D' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#C9A84C' }} />
        </div>
      )}

      {/* Liste vide */}
      {!loading && signatures.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(201,168,76,0.1)' }}>
            <FileText className="w-7 h-7" style={{ color: '#C9A84C' }} />
          </div>
          <h3 className="font-medium mb-1" style={{ color: '#F5F0E8', fontFamily: 'Syne, sans-serif' }}>
            {search ? 'Aucun résultat' : 'Aucune signature pour l\'instant'}
          </h3>
          <p className="text-sm" style={{ color: 'rgba(245,240,232,0.4)' }}>
            {search ? `Aucune signature ne correspond à "${search}"` : 'Vos signatures apparaîtront ici'}
          </p>
        </div>
      )}

      {/* Liste */}
      {!loading && signatures.length > 0 && (
        <ul>
          {signatures.map((sig) => {
            const isOpen = openId === sig.id
            const avatarColor = getAvatarColor(sig.signer_name)
            const contractName = sig.contract_name ?? sig.contracts?.[0]?.name

            return (
              <li key={sig.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>

                {/* En-tête cliquable */}
                <button
                  className="w-full px-4 sm:px-6 py-4 flex items-center gap-3 text-left"
                  onClick={() => toggleOpen(sig.id)}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                    style={{ background: avatarColor.bg, color: avatarColor.color, fontFamily: 'Syne, sans-serif' }}
                  >
                    {getInitials(sig.signer_name)}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#F5F0E8' }}>
                      {sig.signer_name}
                    </p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(245,240,232,0.35)' }}>
                      {formatDate(sig.signed_at)}
                    </p>
                  </div>

                  {/* Badge + chevron */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md"
                      style={sig.status === 'signed'
                        ? { background: 'rgba(170,255,0,0.12)', color: '#AAFF00' }
                        : { background: 'rgba(255,184,48,0.12)', color: '#FFB830' }
                      }
                    >
                      {sig.status === 'signed'
                        ? <CheckCircle className="w-3 h-3" />
                        : <Clock className="w-3 h-3" />
                      }
                      {sig.status === 'signed' ? 'Signé' : 'En attente'}
                    </span>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4" style={{ color: '#C9A84C' }} />
                      : <ChevronDown className="w-4 h-4" style={{ color: 'rgba(245,240,232,0.3)' }} />
                    }
                  </div>
                </button>

                {/* Détail déroulant */}
                {isOpen && (
                  <div className="px-4 sm:px-6 pb-4" style={{ background: 'rgba(15,25,35,0.5)' }}>
                    <div className="rounded-xl p-3 space-y-2.5 mb-3" style={{ background: '#1A2733' }}>

                      <div className="flex items-center gap-2.5">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(245,240,232,0.4)' }} />
                        <span className="text-xs" style={{ color: 'rgba(245,240,232,0.5)' }}>{sig.signer_email}</span>
                      </div>

                      {sig.signer_phone && (
                        <div className="flex items-center gap-2.5">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(245,240,232,0.4)' }} />
                          <span className="text-xs" style={{ color: 'rgba(245,240,232,0.5)' }}>{sig.signer_phone}</span>
                        </div>
                      )}

                      {contractName && (
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#C9A84C' }} />
                          <span className="text-xs" style={{ color: '#C9A84C' }}>{contractName}</span>
                        </div>
                      )}

                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {sig.status === 'signed' && (
                        <button
                          onClick={() => handleOpenPdf(sig.id)}
                          disabled={loadingPdfId === sig.id}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
                          style={{ background: 'rgba(170,255,0,0.1)', color: '#AAFF00' }}
                        >
                          <Eye className="w-4 h-4" />
                          {loadingPdfId === sig.id ? 'Chargement…' : 'Voir le PDF'}
                        </button>
                      )}
                      <button
                        onClick={() => setSignatureToDelete(sig)}
                        disabled={deletingId === sig.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
                        style={{ background: 'rgba(255,77,109,0.1)', color: '#FF4D6D' }}
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}

              </li>
            )
          })}
        </ul>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div
          className="px-4 sm:px-6 py-4 flex items-center justify-between"
          style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(245,240,232,0.35)' }}>
            {total} signature{total > 1 ? 's' : ''}
            {search && ` · "${search}"`}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-opacity disabled:opacity-30"
              style={{ background: '#1A2733', color: '#F5F0E8' }}
            >
              ‹
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all"
                style={page === p
                  ? { background: '#AAFF00', color: '#0F1923' }
                  : { background: '#1A2733', color: 'rgba(245,240,232,0.4)' }
                }
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-opacity disabled:opacity-30"
              style={{ background: '#1A2733', color: '#F5F0E8' }}
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* Total sans pagination */}
      {!loading && totalPages === 1 && total > 0 && (
        <div className="px-4 sm:px-6 py-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs" style={{ color: 'rgba(245,240,232,0.35)' }}>
            {total} signature{total > 1 ? 's' : ''}
            {search && ` · "${search}"`}
          </p>
        </div>
      )}

      {/* Modale confirmation */}
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