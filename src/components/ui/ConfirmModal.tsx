import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  onConfirm,
  onClose,
}: Props) {
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modale */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-auto">

        {/* Icône */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4
          ${variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'}`}
        >
          <Trash2 className={`w-5 h-5 ${variant === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />
        </div>

        {/* Texte */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
          <p className="text-sm text-slate-500">{message}</p>
        </div>

        {/* Boutons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            className={`flex-1 ${variant === 'danger'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>

      </div>
    </>
  )
}