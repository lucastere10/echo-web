import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import GoogleIcon from '#/components/GoogleIcon'
import QueuePanel from '#/components/QueuePanel'
import UploadZone from '#/components/UploadZone'
import { getSessionLabel } from '#/lib/auth/session'
import {
  FILE_ACCEPT,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_FORMATS_LABEL,
  getFileExtension,
  isVideoFile,
} from '#/lib/media'
import { getUploadConfig } from '#/server/upload'

export const Route = createFileRoute('/')({
  loader: () => getUploadConfig(),
  component: HomePage,
})

type FileItem = {
  id: string
  file: File
  duration?: number
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  text?: string
  error?: string
}

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

function HomePage() {
  const uploadConfig = Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const [queue, setQueue] = useState<FileItem[]>([])
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams()
  const urlError = searchParams.get('error')

  const accessError = useMemo(() => {
    if (urlError === 'no_access') {
      return 'Apenas o administrador pode entrar com Google.'
    }
    if (urlError === 'auth_failed') {
      return 'Falha ao entrar. Tente novamente.'
    }
    return null
  }, [urlError])

  const processQueue = useCallback(async () => {
    if (isProcessing) return

    const pending = queue.filter((item) => item.status === 'queued')
    if (pending.length === 0) return

    setIsProcessing(true)

    for (const item of pending) {
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
          pending.length,
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
    const accepted: FileItem[] = []

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
        file,
        duration: await readDuration(file),
        status: 'queued',
        progress: 0,
      })
    }

    if (accepted.length > 0) {
      setQueue((current) => [...current, ...accepted])
    }
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
            Use um link de convite para acessar a plataforma ou entre com Google
            se você for o administrador.
          </p>
          {accessError ? (
            <p className="echo-alert-danger mb-6">{accessError}</p>
          ) : null}
          <a href="/auth/google" className="echo-button inline-flex">
            <GoogleIcon />
            Entrar com Google
          </a>
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
    fileName: item.file.name,
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

      <QueuePanel items={queueItems} onRemove={removeQueuedFile} />
    </main>
  )
}
