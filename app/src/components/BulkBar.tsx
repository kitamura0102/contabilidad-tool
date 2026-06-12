import { RotateCcw, CheckCircle, Trash2, X } from 'lucide-react'

export type BulkAction = 'reintentar' | 'revisar' | 'delete'

interface BulkBarProps {
  count: number
  canReintentar: number   // # of selected in error_extraccion
  canRevisar: number       // # of selected in pendiente_revision
  busy: BulkAction | null
  progress: { done: number; total: number } | null
  onReintentar: () => void
  onRevisar: () => void
  onDelete: () => void
  onClear: () => void
}

export default function BulkBar({
  count, canReintentar, canRevisar, busy, progress,
  onReintentar, onRevisar, onDelete, onClear,
}: BulkBarProps) {
  if (count === 0) return null

  if (progress) {
    return (
      <div className="bulk-bar" role="status">
        <span className="bulk-count">Procesando {progress.done} de {progress.total}…</span>
      </div>
    )
  }

  return (
    <div className="bulk-bar" role="toolbar" aria-label="Acciones masivas">
      <span className="bulk-count">{count} seleccionada{count !== 1 ? 's' : ''}</span>
      <span className="bulk-sep" />
      <button
        className="bulk-btn" disabled={canRevisar === 0 || busy !== null}
        onClick={onRevisar}
        title={canRevisar === 0 ? 'Ninguna seleccionada está por revisar' : `Marcar ${canRevisar} como revisadas`}
      >
        <CheckCircle size={14} />Marcar revisadas{canRevisar > 0 && canRevisar !== count ? ` (${canRevisar})` : ''}
      </button>
      <button
        className="bulk-btn" disabled={canReintentar === 0 || busy !== null}
        onClick={onReintentar}
        title={canReintentar === 0 ? 'Ninguna seleccionada está en error' : `Reintentar ${canReintentar}`}
      >
        <RotateCcw size={14} />Reintentar{canReintentar > 0 && canReintentar !== count ? ` (${canReintentar})` : ''}
      </button>
      <button className="bulk-btn danger" disabled={busy !== null} onClick={onDelete} title="Borrar seleccionadas">
        <Trash2 size={14} />Borrar
      </button>
      <span className="bulk-sep" />
      <button className="bulk-btn ghost" onClick={onClear} title="Deseleccionar">
        <X size={14} />
      </button>
    </div>
  )
}
