import { useRef } from 'react'
import { Copy, Download, Eye, FileText, X } from 'lucide-react'
import StatusBadge from '#/components/StatusBadge'

export type QueueItem = {
  id: string
  fileName: string
  duration?: number
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  text?: string
  error?: string
}

type QueuePanelProps = {
  items: QueueItem[]
  onRemove: (id: string) => void
}

function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function StatusGroup({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="echo-card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {title}
        </h2>
        <span className="text-xs text-[var(--text-muted)]">{count}</span>
      </header>
      <div className="divide-y divide-[var(--line)]">{children}</div>
    </section>
  )
}

function CompletedRow({
  fileName,
  duration,
  text,
}: {
  fileName: string
  duration?: number
  text?: string
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  async function copyText() {
    if (!text) return
    await navigator.clipboard.writeText(text)
  }

  function download(extension: 'txt' | 'md') {
    if (!text) return
    const content =
      extension === 'md' ? `# ${fileName}\n\n${text}` : text
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${fileName.replace(/\.[^.]+$/, '')}.${extension}`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function openDialog() {
    dialogRef.current?.showModal()
  }

  function closeDialog() {
    dialogRef.current?.close()
  }

  return (
    <>
      <div className="queue-row">
        <div className="queue-row-main">
          <span className="truncate font-medium text-[var(--text)]">{fileName}</span>
          <span className="shrink-0 text-xs text-[var(--text-muted)]">
            {formatDuration(duration)}
          </span>
        </div>
        {text ? (
          <div className="queue-row-actions">
            <button
              type="button"
              className="echo-action-btn"
              onClick={copyText}
              aria-label="Copiar transcrição"
              title="Copiar"
            >
              <Copy size={14} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="echo-action-btn"
              onClick={openDialog}
              aria-label="Visualizar transcrição"
              title="Visualizar"
            >
              <Eye size={14} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="echo-action-btn"
              onClick={() => download('txt')}
            >
              <FileText size={14} strokeWidth={1.75} />
              TXT
            </button>
            <button
              type="button"
              className="echo-action-btn"
              onClick={() => download('md')}
            >
              <Download size={14} strokeWidth={1.75} />
              Markdown
            </button>
          </div>
        ) : null}
      </div>

      <dialog
        ref={dialogRef}
        className="echo-dialog"
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            closeDialog()
          }
        }}
      >
        <div className="echo-dialog-panel">
          <div className="echo-dialog-header">
            <h2 className="truncate text-base font-semibold text-[var(--text)]">
              {fileName}
            </h2>
            <button
              type="button"
              className="echo-action-btn"
              onClick={closeDialog}
              aria-label="Fechar"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </div>
          <div className="echo-dialog-body">
            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-muted)]">
              {text}
            </p>
          </div>
        </div>
      </dialog>
    </>
  )
}

function ActiveRow({
  fileName,
  duration,
  status,
  progress,
  error,
}: {
  fileName: string
  duration?: number
  status: 'uploading' | 'processing' | 'error'
  progress: number
  error?: string
}) {
  return (
    <div className="queue-row queue-row-stack">
      <div className="queue-row-top">
        <div className="queue-row-main">
          <span className="truncate font-medium text-[var(--text)]">{fileName}</span>
          <span className="shrink-0 text-xs text-[var(--text-muted)]">
            {formatDuration(duration)}
          </span>
        </div>
        <StatusBadge status={status} />
      </div>
      {status === 'uploading' ? (
        <div className="echo-progress-track">
          <div
            className="echo-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
      {error ? <p className="echo-alert-danger">{error}</p> : null}
    </div>
  )
}

function QueuedRow({
  fileName,
  duration,
  onRemove,
}: {
  fileName: string
  duration?: number
  onRemove: () => void
}) {
  return (
    <div className="queue-row">
      <div className="queue-row-main">
        <span className="truncate font-medium text-[var(--text)]">{fileName}</span>
        <span className="shrink-0 text-xs text-[var(--text-muted)]">
          {formatDuration(duration)}
        </span>
      </div>
      <button
        type="button"
        className="echo-action-btn"
        onClick={onRemove}
        aria-label={`Remover ${fileName}`}
        title="Remover"
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  )
}

export default function QueuePanel({ items, onRemove }: QueuePanelProps) {
  const completed = items.filter((item) => item.status === 'completed')
  const active = items.filter((item) =>
    ['uploading', 'processing', 'error'].includes(item.status),
  )
  const queued = items.filter((item) => item.status === 'queued')

  if (items.length === 0) return null

  return (
    <div className="mt-6 grid gap-4">
      {completed.length > 0 ? (
        <StatusGroup title="Concluídos" count={completed.length}>
          {completed.map((item) => (
            <CompletedRow
              key={item.id}
              fileName={item.fileName}
              duration={item.duration}
              text={item.text}
            />
          ))}
        </StatusGroup>
      ) : null}

      {active.length > 0 ? (
        <StatusGroup title="Processando" count={active.length}>
          {active.map((item) => (
            <ActiveRow
              key={item.id}
              fileName={item.fileName}
              duration={item.duration}
              status={
                item.status === 'uploading'
                  ? 'uploading'
                  : item.status === 'error'
                    ? 'error'
                    : 'processing'
              }
              progress={item.progress}
              error={item.error}
            />
          ))}
        </StatusGroup>
      ) : null}

      {queued.length > 0 ? (
        <StatusGroup title="Na fila" count={queued.length}>
          {queued.map((item) => (
            <QueuedRow
              key={item.id}
              fileName={item.fileName}
              duration={item.duration}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </StatusGroup>
      ) : null}
    </div>
  )
}
