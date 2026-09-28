import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createFileRoute } from '@tanstack/react-router'
import { getRequestIP, getSession } from '@tanstack/react-start/server'

import { assertUploadAccess, resolveSession } from '#/lib/auth/access'
import type { SessionData } from '#/lib/auth/session'
import { sessionConfig } from '#/lib/auth/session-config.server'
import { prepareAudioForTranscription } from '#/lib/audio/prepare'
import { env } from '#/lib/env'
import { errors, toErrorResponse } from '#/lib/errors'
import { parseInstagramUrl } from '#/lib/instagram/url'
import { assertProbeWithinLimits } from '#/lib/instagram/validate'
import { downloadInstagram, probeInstagram } from '#/lib/instagram/ytdlp'
import { withJobSlot } from '#/lib/rate-limit/jobs'
import { checkIpRateLimit } from '#/lib/rate-limit/ip'
import { transcribeAudioParts } from '#/lib/openai/transcribe'
import { incrementUploadsUsed } from '#/lib/storage/invitations'

export const Route = createFileRoute('/api/instagram/transcribe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const tempDir = await mkdtemp(join(tmpdir(), 'echo-instagram-'))

        try {
          const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
          checkIpRateLimit(ip)

          const sessionState = await getSession<SessionData>(sessionConfig)
          const session = resolveSession(sessionState.data)
          const access = await assertUploadAccess(session)

          const body = (await request.json()) as { url?: string }
          const parsed = typeof body.url === 'string' ? parseInstagramUrl(body.url) : null
          if (!parsed) {
            throw errors.instagramInvalidUrl()
          }

          const probe = await probeInstagram(parsed.normalizedUrl)
          const validated = assertProbeWithinLimits({
            ...probe,
            shortcode: probe.shortcode ?? parsed.shortcode,
          })

          if (!access.session.isAdmin && access.inviteToken) {
            await incrementUploadsUsed(access.inviteToken)
          }

          const text = await withJobSlot(async () => {
            const { filePath, fileName } = await downloadInstagram(
              parsed.normalizedUrl,
              tempDir,
            )

            const fileStat = await stat(filePath)
            const maxBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024
            if (fileStat.size > maxBytes) {
              throw errors.fileTooLarge(env.MAX_FILE_SIZE_MB)
            }

            const buffer = await readFile(filePath)
            const file = new File([new Uint8Array(buffer)], validated.fileName || fileName, {
              type: 'video/mp4',
            })

            const parts = await prepareAudioForTranscription(file)
            return transcribeAudioParts(parts)
          })

          return Response.json({
            text,
            fileName: validated.fileName,
          })
        } catch (error) {
          return toErrorResponse(error)
        } finally {
          await rm(tempDir, { recursive: true, force: true }).catch(() => undefined)
        }
      },
    },
  },
})
