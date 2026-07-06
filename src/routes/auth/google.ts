import { createFileRoute, redirect } from '@tanstack/react-router'
import { generateCodeVerifier, generateState } from 'arctic'
import { setCookie } from '@tanstack/react-start/server'

import { google, googleScopes } from '#/lib/auth/google'
import {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from '#/lib/auth/session'
import { env } from '#/lib/env'

export const Route = createFileRoute('/auth/google')({
  server: {
    handlers: {
      GET: () => {
        const state = generateState()
        const codeVerifier = generateCodeVerifier()
        const url = google.createAuthorizationURL(state, codeVerifier, googleScopes)

        const cookieOptions = {
          httpOnly: true,
          secure: env.APP_URL.startsWith('https'),
          sameSite: 'lax' as const,
          path: '/',
          maxAge: 60 * 10,
        }

        setCookie(OAUTH_STATE_COOKIE, state, cookieOptions)
        setCookie(OAUTH_VERIFIER_COOKIE, codeVerifier, cookieOptions)

        return redirect({
          href: url.toString(),
          statusCode: 302,
        })
      },
    },
  },
})
