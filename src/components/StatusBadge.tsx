import { Loader2 } from 'lucide-react'

type StatusKey =
  | 'queued'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error'

const statusLabel: Record<StatusKey, string> = {
  queued: 'Na fila',
  uploading: 'Enviando...',
  processing: 'Processando...',
  completed: 'Concluído',
  error: 'Falhou',
}

type StatusBadgeProps = {
  status: StatusKey
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`echo-status echo-status-${status}`}>
      {status === 'processing' ? (
        <Loader2 size={12} strokeWidth={2} className="echo-pulse" aria-hidden />
      ) : null}
      {statusLabel[status]}
    </span>
  )
}
