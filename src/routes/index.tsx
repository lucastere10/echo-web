import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import InstagramLinkInput from '#/components/InstagramLinkInput'
import type { InstagramValidatedLink } from '#/components/InstagramLinkInput'
import QueuePanel from '#/components/QueuePanel'
import UploadZone from '#/components/UploadZone'
import { getSessionLabel } from '#/lib/auth/session'
import {
  SUPPORTED_EXTENSIONS,
  SUPPORTED_FORMATS_LABEL,
  getFileExtension,
  isVideoFile,
} from '#/lib/media'
import { requestMagicLink } from '#/server/auth'
import { getUploadConfig } from '#/server/upload'

export const Route = createFileRoute('/')({
  loader: () => getUploadConfig(),
  component: HomePage,
})

type QueueItemBase = {
  id: string
  fileName: string
  duration?: number
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  text?: string
  error?: string
}

type FileQueueItem = QueueItemBase & {
  source: 'file'
  file: File
}

type InstagramQueueItem = QueueItemBase & {
  source: 'instagram'
  url: string
}

type QueueItem = FileQueueItem | InstagramQueueItem

const SUPPORTED_EXTENSION_SET = new Set<string>(SUPPORTED_EXTENSIONS)

async function readDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const useVideo = isVideoFile(file.name, file.type)
    const media = useVideo
      ? document.createElement('video')
      : new Audio(url)

    if (useVideo) {
      ;(media as HTMLVideoElement).src = url
      ;(media as HTMLVideoElement).preload = 'metadata'
    }

    const cleanup = () => URL.revokeObjectURL(url)

    media.addEventListener('loadedmetadata', () => {
      cleanup()
      resolve(Number.isFinite(media.duration) ? media.duration : undefined)
    })
    media.addEventListener('error', () => {
      cleanup()
      resolve(undefined)
    })
  })
}

function uploadWithProgress(
  file: File,
  batchSize: number,
  onProgress: (value: number) => void,
  onUploadComplete: () => void,
): Promise<{ text: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('batchSize', String(batchSize))

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    xhr.upload.addEventListener('load', () => {
      onUploadComplete()
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
        return
      }

      try {
        const payload = JSON.parse(xhr.responseText) as { error?: string }
        reject(new Error(payload.error ?? 'Falha no envio'))
      } catch {
        reject(new Error('Falha no envio'))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Erro de rede')))
    xhr.open('POST', '/api/transcribe')
    xhr.send(formData)
  })
}

async function transcribeInstagramUrl(
  url: string,
): Promise<{ text: string; fileName: string }> {
  const response = await fetch('/api/instagram/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })

  const payload = (await response.json()) as {
    text?: string
    fileName?: string
    error?: string
  }

  if (!response.ok) {
    throw new Error(payload.error ?? 'Falha na transcrição do Instagram')
  }

  return {
    text: payload.text ?? '',
    fileName: payload.fileName ?? 'instagram.mp4',
  }
}

function MagicLinkForm() {
  const requestMagicLinkFn = useServerFn(requestMagicLink)
  const emailId = useId()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault()
    setFieldError(null)
    setMessage(null)

    const trimmed = email.trim()
    if (!trimmed) {
      setFieldError('Informe seu e-mail.')
      return
    }

    setIsSubmitting(true)
    try {
      await requestMagicLinkFn({ data: trimmed })
      setMessage('Se este e-mail tiver acesso, enviamos um link para entrar.')
    } catch (cause) {
      setFieldError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível enviar o link. Tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mx-auto grid max-w-sm gap-3 text-left" onSubmit={handleSubmit} noValidate>
      <label className="grid gap-2 text-sm font-medium text-[var(--text)]" htmlFor={emailId}>
        <span>E-mail</span>
        <input
          id={emailId}
          type="email"
          name="email"
          className="echo-input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          required
          disabled={isSubmitting}
          placeholder="voce@exemplo.com"
        />
      </label>
      {fieldError ? (
        <p className="echo-alert-danger" role="alert">
          {fieldError}
        </p>
      ) : null}
      {message ? (
        <output className="echo-alert-success block w-full">{message}</output>
      ) : null}
      <button type="submit" className="echo-button" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando...' : 'Enviar link de acesso'}
      </button>
    </form>
  )
}

function HomePage() {
  const uploadConfig = Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams()
  const urlError = searchParams.get('error')

  const accessError = useMemo(() => {
    if (urlError === 'no_access') {
      return 'Este e-mail não tem acesso.'
    }
    if (urlError === 'auth_failed') {
      return 'O link de acesso é inválido ou expirou. Peça um novo.'
    }
    return null
  }, [urlError])

  const processQueue = useCallback(async () => {
    if (isProcessing) return

    const pending = queue.filter((item) => item.status === 'queued')
    if (pending.length === 0) return

    setIsProcessing(true)

    for (const item of pending) {
      if (item.source === 'instagram') {
        setQueue((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: 'processing', progress: 0 }
              : entry,
          ),
        )

        try {
          const result = await transcribeInstagramUrl(item.url)
          setQueue((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: 'completed',
                    progress: 100,
                    text: result.text,
                    fileName: result.fileName || entry.fileName,
                  }
                : entry,
            ),
          )
        } catch (error) {
          setQueue((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: 'error',
                    error:
                      error instanceof Error
                        ? error.message
                        : 'Falha na transcrição',
                  }
                : entry,
            ),
          )
        }
        continue
      }

      setQueue((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, status: 'uploading', progress: 0 }
            : entry,
        ),
      )

      try {
        const result = await uploadWithProgress(
          item.file,
          pending.filter((entry) => entry.source === 'file').length,
          (progress) => {
            setQueue((current) =>
              current.map((entry) =>
                entry.id === item.id ? { ...entry, progress } : entry,
              ),
            )
          },
          () => {
            setQueue((current) =>
              current.map((entry) =>
                entry.id === item.id
                  ? { ...entry, status: 'processing', progress: 100 }
                  : entry,
              ),
            )
          },
        )

        setQueue((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: 'completed',
                  progress: 100,
                  text: result.text,
                }
              : entry,
          ),
        )
      } catch (error) {
        setQueue((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: 'error',
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Falha na transcrição',
                }
              : entry,
          ),
        )
      }
    }

    setIsProcessing(false)
  }, [isProcessing, queue])

  useEffect(() => {
    if (!uploadConfig.canUpload || isProcessing) return
    const hasQueued = queue.some((item) => item.status === 'queued')
    if (hasQueued) {
      void processQueue()
    }
  }, [queue, uploadConfig.canUpload, isProcessing, processQueue])

  async function handleFilesSelected(files: File[]) {
    setValidationMessage(null)

    if (!uploadConfig.canUpload) return

    const currentCount = queue.filter((item) => item.status === 'queued').length
    if (currentCount + files.length > uploadConfig.maxFilesPerUpload) {
      setValidationMessage(
        `Você pode enviar até ${uploadConfig.maxFilesPerUpload} arquivos por vez.`,
      )
      return
    }

    const maxBytes = uploadConfig.maxFileSizeMb * 1024 * 1024
    const accepted: FileQueueItem[] = []

    for (const file of files) {
      const extension = getFileExtension(file.name)
      if (!SUPPORTED_EXTENSION_SET.has(extension)) {
        setValidationMessage(
          `${file.name} não é suportado. Use ${SUPPORTED_FORMATS_LABEL}.`,
        )
        continue
      }

      if (file.size > maxBytes) {
        setValidationMessage(
          `${file.name} é muito grande. O tamanho máximo é ${uploadConfig.maxFileSizeMb} MB.`,
        )
        continue
      }

      accepted.push({
        id: crypto.randomUUID(),
        source: 'file',
        file,
        fileName: file.name,
        duration: await readDuration(file),
        status: 'queued',
        progress: 0,
      })
    }

    if (accepted.length > 0) {
      setQueue((current) => [...current, ...accepted])
    }
  }

  function handleInstagramSubmit(link: InstagramValidatedLink) {
    setValidationMessage(null)

    const busy = queue.some(
      (item) =>
        item.status === 'queued' ||
        item.status === 'uploading' ||
        item.status === 'processing',
    )
    if (busy) {
      setValidationMessage(
        'Aguarde a fila atual terminar antes de enviar outro link do Instagram.',
      )
      return
    }

    const queuedCount = queue.filter((item) => item.status === 'queued').length
    if (queuedCount >= uploadConfig.maxFilesPerUpload) {
      setValidationMessage(
        `Você pode enviar até ${uploadConfig.maxFilesPerUpload} itens por vez.`,
      )
      return
    }

    setQueue((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        source: 'instagram',
        url: link.url,
        fileName: link.fileName,
        duration: link.durationSeconds,
        status: 'queued',
        progress: 0,
      },
    ])
  }

  function removeQueuedFile(id: string) {
    setQueue((current) =>
      current.filter((item) => !(item.id === id && item.status === 'queued')),
    )
  }

  if (!session) {
    return (
      <main className="page-wrap px-4 pb-8 pt-14">
        <section className="island-shell mx-auto max-w-2xl px-6 py-10 text-center sm:px-10">
          <p className="island-kicker mb-3">Echo</p>
          <h1 className="display-title mb-4 text-4xl text-[var(--text)] sm:text-5xl">
            Transcrição de áudio com IA
          </h1>
          <p className="mb-8 text-[var(--text-muted)]">
            Use um link de convite para acessar a plataforma ou entre com o e-mail
            autorizado.
          </p>
          {accessError ? (
            <p className="echo-alert-danger mb-6">{accessError}</p>
          ) : null}
          <MagicLinkForm />
        </section>
      </main>
    )
  }

  if (!uploadConfig.canUpload) {
    return (
      <main className="page-wrap px-4 pb-8 pt-14">
        <section className="island-shell mx-auto max-w-2xl px-6 py-10 text-center sm:px-10">
          <p className="island-kicker mb-3">Acesso necessário</p>
          <h1 className="display-title mb-4 text-3xl text-[var(--text)]">
            Convite necessário
          </h1>
          <p className="mb-8 text-[var(--text-muted)]">
            Você está conectado como {getSessionLabel(session)}, mas não tem
            permissão para enviar arquivos. Abra um link de convite válido para
            continuar.
          </p>
          {accessError ? (
            <p className="echo-alert-danger mb-6">{accessError}</p>
          ) : null}
        </section>
      </main>
    )
  }

  const queueItems = queue.map((item) => ({
    id: item.id,
    fileName: item.fileName,
    duration: item.duration,
    status: item.status,
    progress: item.progress,
    text: item.text,
    error: item.error,
  }))

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="mb-8 text-center">
        <p className="island-kicker mb-3">Echo</p>
        <h1 className="display-title text-4xl text-[var(--text)] sm:text-5xl">
          Transcrever áudio ou vídeo
        </h1>
      </section>

      <UploadZone
        disabled={isProcessing}
        maxFiles={uploadConfig.maxFilesPerUpload}
        onFilesSelected={handleFilesSelected}
        validationMessage={validationMessage}
      />

      <InstagramLinkInput
        disabled={isProcessing}
        maxDurationSeconds={uploadConfig.maxInstagramDurationSeconds}
        maxFileSizeMb={uploadConfig.maxFileSizeMb}
        onSubmit={handleInstagramSubmit}
      />

      <QueuePanel items={queueItems} onRemove={removeQueuedFile} />
    </main>
  )
}
