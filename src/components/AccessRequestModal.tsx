import { useId, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { requestAccess } from '#/server/auth'
import { useToast } from '#/components/Toast'

export default function AccessRequestModal() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const emailId = useId()
  const errorId = useId()
  const requestAccessFn = useServerFn(requestAccess)
  const { showToast } = useToast()

  function openModal() {
    setOpen(true)
    setFieldError(null)
    dialogRef.current?.showModal()
  }

  function closeModal() {
    setOpen(false)
    dialogRef.current?.close()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldError(null)

    const trimmed = email.trim()
    if (!trimmed) {
      setFieldError('Informe seu e-mail.')
      return
    }

    setIsSubmitting(true)
    try {
      await requestAccessFn({ data: trimmed })
      showToast('Solicitação enviada. O administrador entrará em contato.')
      setEmail('')
      closeModal()
    } catch (cause) {
      setFieldError(
        cause instanceof Error ? cause.message : 'Não foi possível enviar a solicitação.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="echo-button-compact"
        onClick={openModal}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Solicitar acesso
      </button>

      <dialog
        ref={dialogRef}
        className="echo-dialog"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            closeModal()
          }
        }}
      >
        <div className="echo-dialog-panel">
          <div className="echo-dialog-header">
            <h2 className="text-base font-semibold text-[var(--text)]">
              Solicitar acesso
            </h2>
          </div>
          <form className="echo-dialog-body" onSubmit={handleSubmit} noValidate>
            <p className="mb-4 text-sm text-[var(--text-muted)]">
              Informe seu e-mail. O administrador avaliará sua solicitação e enviará um
              convite se aprovado.
            </p>
            <label className="mb-4 grid gap-2 text-sm font-medium text-[var(--text)]" htmlFor={emailId}>
              E-mail
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
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? errorId : undefined}
                disabled={isSubmitting}
                placeholder="voce@exemplo.com"
              />
            </label>
            {fieldError ? (
              <p id={errorId} className="echo-alert-danger mb-4" role="alert">
                {fieldError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="echo-button-secondary"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button type="submit" className="echo-button" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Enviar solicitação'}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
}
