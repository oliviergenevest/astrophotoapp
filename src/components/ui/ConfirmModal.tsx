import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  message: string
  warningNote?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmModal({
  title,
  message,
  warningNote,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  onConfirm,
  onClose,
}: Props) {
  const icon: ReactNode =
    variant === 'danger' ? (
      <Trash2 className="h-[22px] w-[22px] text-signa-danger" />
    ) : (
      <XCircle className="h-[22px] w-[22px] text-signa-warning" />
    )

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-signa-night/80 animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modale */}
      <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 overflow-hidden rounded-2xl border-[0.5px] border-signa-neutral bg-signa-night-2">
        <div className="flex items-start gap-3.5 px-6 pt-6">
          <div
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${
              variant === 'danger' ? 'bg-signa-danger/15' : 'bg-signa-warning/15'
            }`}
          >
            {icon}
          </div>
          <div>
            <h3 className="font-syne text-[17px] font-bold leading-tight text-signa-cream">
              {title}
            </h3>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 text-sm leading-relaxed text-signa-cream/70">
          {message}
          {warningNote && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border-[0.5px] border-signa-warning/30 bg-signa-warning/10 px-3.5 py-2.5 text-[13px] text-signa-warning">
              <AlertTriangle className="h-[15px] w-[15px] flex-shrink-0" />
              {warningNote}
            </div>
          )}
        </div>

        <div className="h-px bg-signa-neutral" />

        <div className="flex gap-2.5 px-6 py-6">
          <Button
            variant="outline"
            className="flex-1 border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            className={`flex-1 border bg-white hover:bg-opacity-90 ${
              variant === 'danger'
                ? 'border-signa-danger/80 text-signa-danger hover:bg-signa-danger/10'
                : 'border-signa-warning text-amber-700 hover:bg-signa-warning/10'
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