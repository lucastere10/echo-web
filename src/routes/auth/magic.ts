import { createFileRoute, redirect } from '@tanstack/react-router'
import { clearSession, updateSession } from '@tanstack/react-start/server'

import { isAdminEmail, isEmailAllowed } from '#/lib/auth/allowlist'
import { verifyMagicLink } from '#/lib/auth/magic-link'
import type { SessionData } from '#/lib/auth/session'
import { sessionConfig } from '#/lib/auth/session-config.server'
import { env } from '#/lib/env'

export const Route = createFileRoute('/auth/magic')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const token = url.searchParams.get('token')
        const email = token ? verifyMagicLink(token) : null

        if (!email || !isEmailAllowed(email)) {
          return redirect({
            href: `${env.APP_URL}/?error=auth_failed`,
            statusCode: 302,
          })
        }

        const sessionData: SessionData = {
          email,
          isAdmin: isAdminEmail(email),
        }

        await clearSession(sessionConfig)
        await updateSession(sessionConfig, sessionData)
        return redirect({
          href: env.APP_URL,
          statusCode: 302,
        })
      },
    },
  },
})
