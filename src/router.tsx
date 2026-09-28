import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import type { SessionData } from '#/lib/auth/session'
import { routeTree } from './routeTree.gen'

export interface RouterContext {
  session: SessionData | null
}

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    context: {
      session: null,
    },
    defaultNotFoundComponent: () => (
      <main className="page-wrap px-4 pb-8 pt-14">
        <section className="island-shell mx-auto max-w-lg px-6 py-10 text-center sm:px-10">
          <p className="island-kicker mb-3">404</p>
          <h1 className="display-title mb-4 text-3xl text-[var(--text)]">
            Página não encontrada
          </h1>
          <p className="mb-8 text-[var(--text-muted)]">
            Este endereço não existe no Echo.
          </p>
          <a href="/" className="echo-button inline-flex">
            Voltar ao início
          </a>
        </section>
      </main>
    ),
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
