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
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
