import { createFileRoute } from '@tanstack/react-router'
import { getRequestIP, getSession } from '@tanstack/react-start/server'

import { assertUploadAccess, resolveSession } from '#/lib/auth/access'
import type { SessionData } from '#/lib/auth/session'
import { sessionConfig } from '#/lib/auth/session-config.server'
import { errors, toErrorResponse } from '#/lib/errors'
import { parseInstagramUrl } from '#/lib/instagram/url'
import { assertProbeWithinLimits } from '#/lib/instagram/validate'
import { probeInstagram } from '#/lib/instagram/ytdlp'
import { checkIpRateLimit } from '#/lib/rate-limit/ip'

export const Route = createFileRoute('/api/instagram/validate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
          checkIpRateLimit(ip)

          const sessionState = await getSession<SessionData>(sessionConfig)
          const session = resolveSession(sessionState.data)
          await assertUploadAccess(session)

          const body = (await request.json()) as { url?: string }
          const parsed = typeof body.url === 'string' ? parseInstagramUrl(body.url) : null
          if (!parsed) {
            throw errors.instagramInvalidUrl()
          }

          const probe = await probeInstagram(parsed.normalizedUrl)
          const result = assertProbeWithinLimits({
            ...probe,
            shortcode: probe.shortcode ?? parsed.shortcode,
          })

          return Response.json(result)
        } catch (error) {
          return toErrorResponse(error)
        }
      },
    },
  },
})
