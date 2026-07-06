import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  deleteCookie,
  getCookie,
  setCookie,
  updateSession,
} from '@tanstack/react-start/server'

import { fetchGoogleUser, google } from '#/lib/auth/google'
import type { SessionData } from '#/lib/auth/session'
import {
  FLASH_ERROR_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from '#/lib/auth/session'
import { sessionConfig } from '#/lib/auth/session-config.server'
import { env } from '#/lib/env'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const storedState = getCookie(OAUTH_STATE_COOKIE)
        const codeVerifier = getCookie(OAUTH_VERIFIER_COOKIE)

        deleteCookie(OAUTH_STATE_COOKIE)
        deleteCookie(OAUTH_VERIFIER_COOKIE)

        if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
          return redirect({
            href: `${env.APP_URL}/?error=auth_failed`,
            statusCode: 302,
          })
        }

        try {
          const tokens = await google.validateAuthorizationCode(code, codeVerifier)
          const profile = await fetchGoogleUser(tokens.accessToken())

          if (profile.email !== env.ADMIN_EMAIL) {
            setCookie(FLASH_ERROR_COOKIE, 'no_access', {
              httpOnly: false,
              secure: env.APP_URL.startsWith('https'),
              sameSite: 'lax',
              path: '/',
              maxAge: 60,
            })
            return redirect({
              href: `${env.APP_URL}/?error=no_access`,
              statusCode: 302,
            })
          }

          const sessionData: SessionData = {
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            isAdmin: true,
          }

          await updateSession(sessionConfig, sessionData)
          return redirect({
            href: `${env.APP_URL}/`,
            statusCode: 302,
          })
        } catch (error) {
          console.error('OAuth callback failed:', error)
          return redirect({
            href: `${env.APP_URL}/?error=auth_failed`,
            statusCode: 302,
          })
        }
      },
    },
  },
})
