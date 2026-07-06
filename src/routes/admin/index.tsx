import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Copy, Link2, ShieldBan } from 'lucide-react'
import { useToast } from '#/components/Toast'
import {
  createInviteAdmin,
  listInvitesAdmin,
  revokeInviteAdmin,
} from '#/server/auth'

export const Route = createFileRoute('/admin/')({
  beforeLoad: ({ context }) => {
    if (!context.session?.isAdmin) {
      throw redirect({ to: '/' })
    }
  },
  loader: () => listInvitesAdmin(),
  component: AdminPage,
})

function AdminPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const invitations = Route.useLoaderData()
  const createInvite = useServerFn(createInviteAdmin)
  const revokeInvite = useServerFn(revokeInviteAdmin)
  const [maxUploads, setMaxUploads] = useState(10)
  const [maxFilesPerUpload, setMaxFilesPerUpload] = useState(5)
  const [isCreating, setIsCreating] = useState(false)
  const [createdUrl, setCreatedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const active = invitations.filter((item) => item.status === 'active')
  const expired = invitations.filter((item) => item.status === 'expired')
  const revoked = invitations.filter((item) => item.status === 'revoked')

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setIsCreating(true)
    setError(null)
    setCreatedUrl(null)
    try {
      const invitation = await createInvite({
        data: { maxUploads, maxFilesPerUpload },
      })
      setCreatedUrl(invitation.url)
      await router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao criar convite')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleRevoke(token: string) {
    await revokeInvite({ data: token })
    await router.invalidate()
    showToast('Convite revogado.')
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url)
    showToast('Link copiado.')
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell px-6 py-8 sm:px-10">
        <p className="island-kicker mb-2">Administrador</p>
        <h1 className="display-title mb-6 text-3xl text-[var(--text)] sm:text-4xl">
          Convites
        </h1>

        <form
          onSubmit={handleCreate}
          className="mb-8 grid gap-4 border border-[var(--line)] bg-[var(--surface)] p-5 sm:grid-cols-3"
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          <label className="grid gap-2 text-sm font-medium text-[var(--text)]">
            Máx. envios
            <input
              type="number"
              min={1}
              value={maxUploads}
              onChange={(event) => setMaxUploads(Number(event.target.value))}
              className="echo-input"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-[var(--text)]">
            Máx. arquivos por envio
            <input
              type="number"
              min={1}
              value={maxFilesPerUpload}
              onChange={(event) =>
                setMaxFilesPerUpload(Number(event.target.value))
              }
              className="echo-input"
            />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={isCreating} className="echo-button w-full">
              {isCreating ? 'Criando...' : 'Gerar convite'}
            </button>
          </div>
        </form>

        {createdUrl ? (
          <div className="echo-alert-success mb-8">
            <p className="mb-2 text-sm font-semibold text-[var(--text)]">
              Convite criado
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 break-all text-sm text-[var(--text-muted)]">
                {createdUrl}
              </code>
              <button
                type="button"
                className="echo-button-secondary"
                onClick={() => void handleCopy(createdUrl)}
              >
                <Copy size={16} strokeWidth={1.75} />
                Copiar
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="echo-alert-danger mb-6">{error}</p>
        ) : null}

        <InviteSection
          title="Ativos"
          items={active}
          onCopy={handleCopy}
          onRevoke={handleRevoke}
        />
        <InviteSection title="Expirados" items={expired} onCopy={handleCopy} />
        <InviteSection title="Revogados" items={revoked} onCopy={handleCopy} />
      </section>
    </main>
  )
}

function InviteSection({
  title,
  items,
  onCopy,
  onRevoke,
}: {
  title: string
  items: Array<{
    token: string
    createdAt: string
    expiresAt: string
    maxUploads: number
    maxFilesPerUpload: number
    uploadsUsed: number
    url: string
    status: string
  }>
  onCopy: (url: string) => void | Promise<void>
  onRevoke?: (token: string) => void | Promise<void>
}) {
  if (items.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-[var(--text)]">{title}</h2>
      <div
        className="overflow-x-auto border border-[var(--line)]"
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface)] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Criado</th>
              <th className="px-4 py-3 font-medium">Expira</th>
              <th className="px-4 py-3 font-medium">Uso</th>
              <th className="px-4 py-3 font-medium">Arquivos / envio</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.token} className="border-t border-[var(--line)]">
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {new Date(item.createdAt).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {new Date(item.expiresAt).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-[var(--text)]">
                  {item.uploadsUsed} / {item.maxUploads}
                </td>
                <td className="px-4 py-3 text-[var(--text)]">
                  {item.maxFilesPerUpload}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="echo-button-secondary"
                      onClick={() => void onCopy(item.url)}
                    >
                      <Link2 size={16} strokeWidth={1.75} />
                      Copiar link
                    </button>
                    {onRevoke && item.status === 'active' ? (
                      <button
                        type="button"
                        className="echo-button-danger"
                        onClick={() => void onRevoke(item.token)}
                      >
                        <ShieldBan size={16} strokeWidth={1.75} />
                        Revogar
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
