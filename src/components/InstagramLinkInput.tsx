import { useEffect, useId, useRef, useState } from 'react'

import InstagramIcon from '#/components/InstagramIcon'
import {
  INSTAGRAM_URL_HINT,
  isValidInstagramMediaUrl,
  parseInstagramUrl,
} from '#/lib/instagram/url'

export type InstagramValidatedLink = {
  url: string
  fileName: string
  durationSeconds?: number
  approxSizeMb?: number
  title?: string
  shortcode?: string
}

type InstagramLinkInputProps = {
  disabled?: boolean
  maxDurationSeconds: number
  maxFileSizeMb: number
  onSubmit: (link: InstagramValidatedLink) => void
}

type ValidateResponse = {
  ok?: boolean
  title?: string
  durationSeconds?: number
  approxSizeMb?: number
  shortcode?: string
  fileName?: string
  error?: string
}

type ValidationState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'invalid'; message: string }
  | { status: 'ready'; data: InstagramValidatedLink }

const BETA_TOOLTIP =
  'Protótipo: podem ocorrer erros ou falhas em alguns links.'

function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return ''
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function InstagramLinkInput({
  disabled = false,
  maxDurationSeconds,
  maxFileSizeMb,
  onSubmit,
}: InstagramLinkInputProps) {
  const inputId = useId()
  const [value, setValue] = useState('')
  const [state, setState] = useState<ValidationState>({ status: 'idle' })
  const requestIdRef = useRef(0)

  useEffect(() => {
    const trimmed = value.trim()
    if (!trimmed) {
      setState({ status: 'idle' })
      return
    }

    if (!isValidInstagramMediaUrl(trimmed)) {
      setState({ status: 'invalid', message: INSTAGRAM_URL_HINT })
      return
    }

    const parsed = parseInstagramUrl(trimmed)
    if (!parsed) {
      setState({ status: 'invalid', message: INSTAGRAM_URL_HINT })
      return
    }

    const requestId = ++requestIdRef.current
    setState({ status: 'checking' })

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch('/api/instagram/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: parsed.normalizedUrl }),
          })
          const payload = (await response.json()) as ValidateResponse

          if (requestId !== requestIdRef.current) return

          if (!response.ok) {
            setState({
              status: 'invalid',
              message: payload.error ?? 'Não foi possível validar este link.',
            })
            return
          }

          setState({
            status: 'ready',
            data: {
              url: parsed.normalizedUrl,
              fileName: payload.fileName ?? `instagram-${parsed.shortcode}.mp4`,
              durationSeconds: payload.durationSeconds,
              approxSizeMb: payload.approxSizeMb,
              title: payload.title,
              shortcode: payload.shortcode ?? parsed.shortcode,
            },
          })
        } catch {
          if (requestId !== requestIdRef.current) return
          setState({
            status: 'invalid',
            message: 'Falha ao validar o link. Tente novamente.',
          })
        }
      })()
    }, 400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [value])

  const ready = state.status === 'ready' ? state.data : null
  const canSubmit = Boolean(ready) && !disabled

  return (
    <section className="echo-card mt-6 px-4 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          Ou cole um link do Instagram
        </h2>
        <span className="echo-beta-chip" title={BETA_TOOLTIP}>
          Beta
        </span>
      </div>

      <p className="mb-3 text-xs text-[var(--text-muted)]">
        Reels e posts públicos, até {Math.floor(maxDurationSeconds / 60)} min e{' '}
        {maxFileSizeMb} MB.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="sr-only">
            Link do Instagram
          </label>
          <input
            id={inputId}
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            placeholder="https://www.instagram.com/reel/…"
            className="echo-input w-full"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="echo-button shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSubmit}
          onClick={() => {
            if (!ready || disabled) return
            onSubmit(ready)
            setValue('')
            setState({ status: 'idle' })
          }}
        >
          Transcrever
        </button>
      </div>

      {state.status === 'checking' ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Validando link…</p>
      ) : null}

      {state.status === 'invalid' ? (
        <p className="echo-alert-warning mt-3">{state.message}</p>
      ) : null}

      {state.status === 'ready' ? (
        <div className="echo-alert-success mt-3 flex items-start gap-2.5">
          <InstagramIcon size={18} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text)]">
              Pode ser transcrito
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {[
                ready?.title,
                formatDuration(ready?.durationSeconds),
                ready?.approxSizeMb != null
                  ? `~${ready.approxSizeMb} MB`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ') || ready?.fileName}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  )
}
