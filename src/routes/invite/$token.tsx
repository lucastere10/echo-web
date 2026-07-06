import { createFileRoute, redirect } from '@tanstack/react-router'
import { acceptInvite } from '#/server/auth'

export const Route = createFileRoute('/invite/$token')({
  loader: async ({ params }) => {
    const result = await acceptInvite({ data: params.token })

    if (!result.ok) {
      return { kind: 'error' as const, message: result.error }
    }

    throw redirect({ to: '/' })
  },
  component: InvitePage,
})

function InvitePage() {
  const data = Route.useLoaderData()

  if (data.kind === 'error') {
    return (
      <main className="page-wrap px-4 pb-8 pt-14">
        <section className="island-shell mx-auto max-w-lg px-6 py-10 text-center sm:px-10">
          <p className="island-kicker mb-3">Convite inválido</p>
          <h1 className="display-title mb-4 text-3xl text-[var(--text)]">
            Não foi possível usar este link
          </h1>
          <p className="mb-8 text-[var(--text-muted)]">{data.message}</p>
          <a href="/" className="echo-button-secondary inline-flex">
            Voltar ao início
          </a>
        </section>
      </main>
    )
  }

  return null
}
